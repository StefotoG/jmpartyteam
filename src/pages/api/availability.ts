import type { APIRoute } from 'astro';
import { db } from '../../server/db/client.ts';
import { isDateAvailable } from '../../server/domain/bookings.ts';
import { availabilityRequest } from '../../server/domain/validation.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.json().catch(() => null);
  const parsed = availabilityRequest.safeParse(payload);

  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  const available = await isDateAvailable(db(), parsed.data.date);

  // A single boolean, never a list of dates: the schedule is not public information.
  return Response.json({ available }, { headers: { 'Cache-Control': 'no-store' } });
};
