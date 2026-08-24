import { describe, expect, it } from 'vitest';
import {
  isValidSession,
  issueSession,
  verifyPassword,
} from '../../src/server/auth/session.ts';

describe('admin session', () => {
  it('accepts a freshly issued session', () => {
    expect(isValidSession(issueSession())).toBe(true);
  });

  it('rejects a missing or malformed cookie', () => {
    expect(isValidSession(undefined)).toBe(false);
    expect(isValidSession('')).toBe(false);
    expect(isValidSession('nonsense')).toBe(false);
    expect(isValidSession('123456')).toBe(false);
  });

  it('rejects a tampered expiry', () => {
    const [, signature] = issueSession().split('.');
    const forged = `${Date.now() + 10_000_000}.${signature}`;

    expect(isValidSession(forged)).toBe(false);
  });

  it('rejects an expired session even when correctly signed', () => {
    const expired = issueSession().replace(/^\d+/, String(Date.now() - 1000));

    expect(isValidSession(expired)).toBe(false);
  });

  it('rejects a wrong password', () => {
    expect(verifyPassword('')).toBe(false);
    expect(verifyPassword('wrong')).toBe(false);
  });
});
