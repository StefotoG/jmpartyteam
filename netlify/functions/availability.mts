import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const TIME_ZONE = 'Europe/Sofia';
const MONTHS_AHEAD = 18;

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    })
  );

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${base64url(signer.sign(privateKey))}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Google token response had no token');
  return data.access_token;
}

/** Expand busy intervals into the set of local calendar dates they touch. */
function expandToDates(
  intervals: Array<{ start: string; end: string }>
): string[] {
  const dates = new Set<string>();

  for (const interval of intervals) {
    const start = new Date(interval.start);
    const end = new Date(interval.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    for (
      let cursor = new Date(start);
      cursor.getTime() <= end.getTime();
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      dates.add(dateFormatter.format(cursor));
    }
    dates.add(dateFormatter.format(end));
  }

  return [...dates].sort();
}

export default async function handler(): Promise<Response> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!clientEmail || !rawKey || !calendarId) {
    return Response.json(
      { configured: false, busyDates: [] },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }

  try {
    const privateKey = rawKey.replace(/\\n/g, '\n');
    const accessToken = await getAccessToken(clientEmail, privateKey);

    const timeMin = new Date();
    const timeMax = new Date(timeMin);
    timeMax.setMonth(timeMax.getMonth() + MONTHS_AHEAD);

    // freeBusy returns only busy time ranges — never event titles, venues or
    // attendees — so clients' private details can never leak to the website.
    const response = await fetch(FREEBUSY_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: TIME_ZONE,
        items: [{ id: calendarId }],
      }),
    });

    if (!response.ok) {
      throw new Error(`freeBusy request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      calendars?: Record<
        string,
        { busy?: Array<{ start: string; end: string }>; errors?: unknown[] }
      >;
    };

    const calendar = data.calendars?.[calendarId];
    if (!calendar || calendar.errors?.length) {
      throw new Error('freeBusy returned errors for the calendar');
    }

    return Response.json(
      {
        configured: true,
        generatedAt: new Date().toISOString(),
        busyDates: expandToDates(calendar.busy ?? []),
      },
      {
        headers: {
          'cache-control': 'public, max-age=0, s-maxage=900',
          'netlify-cdn-cache-control': 'public, s-maxage=900, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('availability lookup failed', error);
    // Deliberately vague: never surface upstream errors or credential state.
    return Response.json(
      { configured: true, error: true, busyDates: [] },
      { status: 502, headers: { 'cache-control': 'no-store' } }
    );
  }
}

export const config = { path: '/api/availability' };
