export const LOCALES = ['bg', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'bg';

// Localized URL segments. BG uses Latin transliteration so links survive being
// pasted into Messenger/Viber without percent-encoding.
export const SEGMENTS = {
  home: { bg: '', en: '' },
  services: { bg: 'uslugi', en: 'services' },
  gallery: { bg: 'galeriya', en: 'gallery' },
  music: { bg: 'muzika', en: 'music' },
  pricing: { bg: 'ceni', en: 'pricing' },
  availability: { bg: 'nalichnost', en: 'availability' },
  about: { bg: 'za-nas', en: 'about' },
  testimonials: { bg: 'otzivi', en: 'testimonials' },
  faq: { bg: 'faq', en: 'faq' },
  blog: { bg: 'blog', en: 'blog' },
  contact: { bg: 'kontakti', en: 'contact' },
  privacy: { bg: 'politika-za-poveritelnost', en: 'privacy-policy' },
  terms: { bg: 'obshti-usloviya', en: 'terms' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof SEGMENTS;

/** Build a trailing-slashed, locale-prefixed path. `home` for the default locale yields `/`. */
export function localePath(lang: Locale, key: RouteKey, slug?: string): string {
  const prefix = lang === DEFAULT_LOCALE ? '' : `/${lang}`;
  const parts = [SEGMENTS[key][lang], slug].filter(
    (part): part is string => Boolean(part)
  );
  return parts.length === 0 ? `${prefix}/` : `${prefix}/${parts.join('/')}/`;
}

export function getLangFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split('/');
  return LOCALES.includes(maybeLocale as Locale)
    ? (maybeLocale as Locale)
    : DEFAULT_LOCALE;
}

export const HTML_LANG: Record<Locale, string> = { bg: 'bg-BG', en: 'en' };
