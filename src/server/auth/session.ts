/**
 * Minimal session handling for the admin area: an HMAC-signed expiry in a cookie, with
 * no server-side store, because there is exactly one operator.
 *
 * Both secrets below are development placeholders. Before any deployment the password
 * must become an argon2 hash and both must move into configuration.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const ADMIN_PASSWORD = 'jm-dev-password';
const SESSION_SECRET = 'jm-dev-session-secret';

export const SESSION_COOKIE = 'jm_admin';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

function sign(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyPassword(candidate: string): boolean {
  return equals(candidate, ADMIN_PASSWORD);
}

export function issueSession(): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  return `${expiresAt}.${sign(String(expiresAt))}`;
}

export function isValidSession(cookie: string | undefined): boolean {
  if (!cookie) return false;

  const [expiresAt, signature] = cookie.split('.');
  if (!expiresAt || !signature) return false;
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now()) return false;

  return equals(signature, sign(expiresAt));
}
