// Ethiopian mobile numbers: Ethio Telecom 09…, Safaricom 07….
// Accepts 0911234567, 911234567, +251911234567, 251 91 123 4567 and returns +251911234567.
export function normalizePhone(input: string): string | null {
  const digits = input.trim().replace(/[\s\-().]/g, "");
  const m = digits.match(/^(?:\+?251|0)?([79]\d{8})$/);
  return m ? `+251${m[1]}` : null;
}

// +251911234567 -> 0911 23 45 67
export function displayPhone(e164: string): string {
  const local = "0" + e164.replace(/^\+251/, "");
  return `${local.slice(0, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
}
