import type { Locale } from '../i18n/routes';

const LOCALE_TAG: Record<Locale, string> = { bg: 'bg-BG', en: 'en-GB' };

/** Bulgaria is in the eurozone — EUR is the only currency on this site. */
export function formatEur(amount: number, lang: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAG[lang], {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string, lang: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[lang], {
    year: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}
