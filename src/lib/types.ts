import type { Locale } from '../i18n/routes';

export type Localized<T = string> = Record<Locale, T>;

/** Set on every seeded document. The production build fails if any survive to launch. */
export interface Placeholderable {
  isPlaceholder?: boolean;
}

export interface SiteSettings extends Placeholderable {
  brandName: string;
  phonePrimary: string;
  phoneSecondary?: string;
  viber?: string;
  whatsapp?: string;
  email: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  cities: Localized<string[]>;
  addressLocality: Localized<string>;
  foundingYear: number;
  eventsCompleted: number;
}

export interface Service extends Placeholderable {
  key: string;
  slug: Localized<string>;
  title: Localized<string>;
  summary: Localized<string>;
  body: Localized<string[]>;
  inclusions: Localized<string[]>;
  image: string;
  order: number;
}

export interface Package extends Placeholderable {
  key: string;
  name: Localized<string>;
  priceEur: number;
  isFrom: boolean;
  features: Localized<string[]>;
  highlighted: boolean;
}

export interface Addon extends Placeholderable {
  key: string;
  name: Localized<string>;
  priceEur: number;
  isFrom: boolean;
}

export interface GalleryItem extends Placeholderable {
  key: string;
  image: string;
  alt: Localized<string>;
  serviceKey: string;
  venue?: string;
  width: number;
  height: number;
}

export interface Mix extends Placeholderable {
  key: string;
  title: string;
  platform: 'mixcloud' | 'soundcloud' | 'youtube';
  embedUrl: string;
  genres: Localized<string[]>;
  durationMinutes: number;
}

export interface Testimonial extends Placeholderable {
  key: string;
  author: string;
  serviceKey: string;
  date: string;
  quote: Localized<string>;
  rating: number;
}

export interface Faq extends Placeholderable {
  key: string;
  question: Localized<string>;
  answer: Localized<string>;
}

export interface SiteContent {
  settings: SiteSettings;
  services: Service[];
  packages: Package[];
  addons: Addon[];
  gallery: GalleryItem[];
  mixes: Mix[];
  testimonials: Testimonial[];
  faqs: Faq[];
}
