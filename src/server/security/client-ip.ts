import type { APIContext } from 'astro';

/**
 * Netlify terminates TLS upstream, so the socket address belongs to the proxy. Its own
 * header is preferred because `x-forwarded-for` is caller-supplied and can be forged
 * unless something trustworthy sets it.
 */
export function clientIp(context: APIContext): string {
  const netlify = context.request.headers.get('x-nf-client-connection-ip');
  if (netlify) return netlify;

  const forwarded = context.request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return context.clientAddress || 'unknown';
}
