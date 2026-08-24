import type { APIRoute } from 'astro';
import { db } from '../../server/db/client.ts';
import { createEnquiry } from '../../server/domain/bookings.ts';
import { enquiryRequest } from '../../server/domain/validation.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.json().catch(() => null);
  const parsed = enquiryRequest.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: 'invalid_request', issues: parsed.error.issues.map((i) => i.path.join('.')) },
      { status: 400 }
    );
  }

  const input = parsed.data;
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
