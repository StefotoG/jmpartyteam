import type { APIRoute } from 'astro';
import {
  issueSession,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from '../../../server/auth/session.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();

  if (!verifyPassword(String(form.get('password') ?? ''))) {
    return redirect('/admin/login?error=1', 303);
  }

  cookies.set(SESSION_COOKIE, issueSession(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  return redirect('/admin', 303);
};
