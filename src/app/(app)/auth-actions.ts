"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { tooManyAttempts, clearAttempts } from "@/lib/ratelimit";
import type { UIKey } from "@/lib/i18n";

export type AuthState = { error?: UIKey; phone?: string; name?: string } | undefined;

export async function signup(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const rawPhone = String(fd.get("phone") ?? "");
  const password = String(fd.get("password") ?? "");
  const keep = { phone: rawPhone, name };
  if (!name) return { error: "err_name", ...keep };
  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: "err_phone", ...keep };
  if (password.length < 8 || password.length > 200) return { error: "err_password", ...keep };
  if (await prisma.owner.findUnique({ where: { phone } })) return { error: "err_taken", ...keep };

  const owner = await prisma.owner.create({ data: { name, phone, passwordHash: await hashPassword(password) } });
  await createSession(owner.id);
  redirect("/dashboard");
}

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const rawPhone = String(fd.get("phone") ?? "");
  const password = String(fd.get("password") ?? "");
  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: "err_phone", phone: rawPhone };
  if (await tooManyAttempts(`login:${phone}`)) return { error: "err_rate", phone: rawPhone };

  const owner = await prisma.owner.findUnique({ where: { phone } });
  if (!owner || !(await verifyPassword(password, owner.passwordHash))) return { error: "err_login", phone: rawPhone };

  await clearAttempts(`login:${phone}`);
  await createSession(owner.id);
  redirect("/dashboard");
}

// ---------- password reset (code sent by the Telegram bot) ----------

export type ResetState = { step: "phone" | "code" | "done"; phone?: string; error?: UIKey } | undefined;

export async function resetPassword(prev: ResetState, fd: FormData): Promise<ResetState> {
  const { createResetCode, consumeResetCode } = await import("@/lib/reset");
  const { tgSend } = await import("@/lib/telegram");
  const rawPhone = String(fd.get("phone") ?? prev?.phone ?? "");
  const phone = normalizePhone(rawPhone);
  if (!phone) return { step: "phone", phone: rawPhone, error: "err_phone" };
  if (await tooManyAttempts(`reset:${phone}`, 6)) return { step: prev?.step ?? "phone", phone: rawPhone, error: "err_rate" };
  const owner = await prisma.owner.findUnique({ where: { phone } });

  if (!fd.get("code")) {
    // Same answer whether or not the number exists, so the form can't be used to find accounts.
    if (owner?.telegramChatId) {
      const code = await createResetCode(owner.id);
      await tgSend(owner.telegramChatId, `Your Gebeta password reset code: <b>${code}</b>\nIt works for 15 minutes. If you didn't ask for this, ignore it.`);
    }
    return { step: "code", phone: rawPhone };
  }

  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { step: "code", phone: rawPhone, error: "err_password" };
  if (!owner || !(await consumeResetCode(owner.id, String(fd.get("code"))))) return { step: "code", phone: rawPhone, error: "err_code" };
  await prisma.owner.update({ where: { id: owner.id }, data: { passwordHash: await hashPassword(password) } });
  await clearAttempts(`login:${phone}`);
  await createSession(owner.id);
  redirect("/dashboard");
}

// ---------- staff invites ----------

export async function acceptInvite(token: string, _prev: AuthState, fd: FormData): Promise<AuthState> {
  const { currentOwnerId } = await import("@/lib/auth");
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt) return { error: "err_invite" };
  let userId = await currentOwnerId();
  if (!userId) {
    const r = await signupOrLogin(fd);
    if ("error" in r) return r;
    userId = r.id;
  }
  await prisma.$transaction([
    prisma.cafeMember.upsert({
      where: { cafeId_userId: { cafeId: invite.cafeId, userId } },
      create: { cafeId: invite.cafeId, userId, role: invite.role },
      update: { role: invite.role },
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  const { cookies } = await import("next/headers");
  (await cookies()).set("gebeta_cafe", invite.cafeId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/dashboard");
}

// Invitees may already have an account (log in) or not (create one).
async function signupOrLogin(fd: FormData): Promise<{ id: string } | { error: UIKey; phone?: string; name?: string }> {
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const rawPhone = String(fd.get("phone") ?? "");
  const password = String(fd.get("password") ?? "");
  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: "err_phone", phone: rawPhone, name };
  const existing = await prisma.owner.findUnique({ where: { phone } });
  if (existing) {
    if (await tooManyAttempts(`login:${phone}`)) return { error: "err_rate", phone: rawPhone };
    if (!(await verifyPassword(password, existing.passwordHash))) return { error: "err_login", phone: rawPhone, name };
    await createSession(existing.id);
    return { id: existing.id };
  }
  if (!name) return { error: "err_name", phone: rawPhone };
  if (password.length < 8) return { error: "err_password", phone: rawPhone, name };
  const owner = await prisma.owner.create({ data: { name, phone, passwordHash: await hashPassword(password) } });
  await createSession(owner.id);
  return { id: owner.id };
}
