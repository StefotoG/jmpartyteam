import { z } from 'zod';

/** Guards against enquiries for dates that have already passed. */
const futureDate = z.iso.date().refine((value) => {
  const today = new Date().toISOString().slice(0, 10);
  return value >= today;
}, 'date must not be in the past');

export const availabilityRequest = z.object({
  date: futureDate,
  serviceKey: z.string().min(1).max(64),
});

export const enquiryRequest = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(32),
  email: z.email().max(254).optional(),
  eventDate: futureDate,
  eventType: z.string().min(1).max(64),
  city: z.string().trim().min(1).max(120),
  guests: z.coerce.number().int().min(1).max(2000).optional(),
  message: z.string().trim().max(2000).optional(),
  // Honeypot: a real browser leaves the hidden field empty, a naive bot fills it in.
  botField: z.string().max(0).optional(),
  consent: z.literal(true),
  locale: z.enum(['bg', 'en']),
});

export type AvailabilityRequest = z.infer<typeof availabilityRequest>;
export type EnquiryRequest = z.infer<typeof enquiryRequest>;
