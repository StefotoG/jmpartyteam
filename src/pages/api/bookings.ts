import type { APIRoute } from 'astro';
import { db } from '../../server/db/client.ts';
import { createEnquiry } from '../../server/domain/bookings.ts';
import { enquiryRequest } from '../../server/domain/validation.ts';
import { clientIp } from '../../server/security/client-ip.ts';
import { consume, ENQUIRY_QUOTA } from '../../server/security/rate-limit.ts';

export const prerender = false;

function tooMany(retryAfterSeconds: number): Response {
  return Response.json(
    { error: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

export const POST: APIRoute = async (context) => {
  const byIp = await consume(db(), `enquiry:ip:${clientIp(context)}`, ENQUIRY_QUOTA);
  if (!byIp.allowed) return tooMany(byIp.retryAfterSeconds);

  const payload = await context.request.json().catch(() => null);
  const parsed = enquiryRequest.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: 'invalid_request', issues: parsed.error.issues.map((i) => i.path.join('.')) },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // Also keyed on the phone number, so rotating IPs does not lift the limit.
  const byPhone = await consume(db(), `enquiry:phone:${input.phone}`, ENQUIRY_QUOTA);
  if (!byPhone.allowed) return tooMany(byPhone.retryAfterSeconds);

  const result = await createEnquiry(db(), {
    fullName: input.name,
    phone: input.phone,
    email: input.email,
    locale: input.locale,
    eventDate: input.eventDate,
    serviceKey: input.eventType,
    city: input.city,
    guestCount: input.guests,
    notes: input.message,
  });

  if (!result.ok) {
    return Response.json({ error: 'unavailable' }, { status: 409 });
  }

  return Response.json({ reference: result.reference }, { status: 201 });
};
