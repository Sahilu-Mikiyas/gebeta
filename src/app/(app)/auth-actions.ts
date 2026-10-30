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
  if (tooManyAttempts(`login:${phone}`)) return { error: "err_rate", phone: rawPhone };

  const owner = await prisma.owner.findUnique({ where: { phone } });
  if (!owner || !(await verifyPassword(password, owner.passwordHash))) return { error: "err_login", phone: rawPhone };

  clearAttempts(`login:${phone}`);
  await createSession(owner.id);
  redirect("/dashboard");
}
