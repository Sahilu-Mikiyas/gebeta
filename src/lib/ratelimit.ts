// Simple in-memory limiter for login attempts. Good enough for a single server;
// move to Redis or Postgres when running more than one instance.
const hits = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(key: string, limit = 8, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  h.count++;
  return h.count > limit;
}

export function clearAttempts(key: string) {
  hits.delete(key);
}
