import { placeholderContent } from '../content/placeholder';
import { sanityClient, sanityConfigured } from './sanity';
import type { SiteContent } from './types';

// Projections flatten sanity-plugin-internationalized-array's `[{_key, value}]` shape into
// the `Localized<T>` objects in ./types, so components stay identical whether content comes
// from Sanity or the local placeholder file.
const loc = (field: string) =>
  `{"bg": ${field}[_key == "bg"][0].value, "en": ${field}[_key == "en"][0].value}`;

const SITE_CONTENT_QUERY = /* groq */ `{
  "settings": *[_type == "siteSettings"][0]{
    isPlaceholder, brandName, phonePrimary, phoneSecondary, viber, whatsapp,
    email, instagram, facebook, tiktok, foundingYear, eventsCompleted,
    "cities": ${loc('cities')},
    "addressLocality": ${loc('addressLocality')}
  },
  "services": *[_type == "service"] | order(order asc){
    isPlaceholder, key, order,
    "title": ${loc('title')},
    "summary": ${loc('summary')},
    "body": ${loc('body')},
    "inclusions": ${loc('inclusions')},
    "slug": {
      "bg": slug[_key == "bg"][0].value.current,
      "en": slug[_key == "en"][0].value.current
    },
    "image": image.asset->url + "?w=1200&h=800&fit=crop&auto=format"
  },
  "packages": *[_type == "pricePackage"] | order(priceEur asc){
    isPlaceholder, key, priceEur, isFrom, highlighted,
    "name": ${loc('name')},
    "features": ${loc('features')}
  },
  "addons": *[_type == "addon"] | order(priceEur asc){
    isPlaceholder, key, priceEur, isFrom,
    "name": ${loc('name')}
  },
  "gallery": *[_type == "galleryItem"] | order(_createdAt desc){
    isPlaceholder, venue,
    "key": _id,
    "alt": ${loc('alt')},
    "serviceKey": service->key,
    "image": image.asset->url + "?w=900&h=900&fit=crop&auto=format",
    "width": 900,
    "height": 900
  },
  "mixes": *[_type == "mix"] | order(_createdAt desc){
    isPlaceholder, title, platform, embedUrl, durationMinutes,
    "key": _id,
    "genres": ${loc('genres')}
  },
  "testimonials": *[_type == "testimonial"] | order(date desc){
    isPlaceholder, author, date, rating,
    "key": _id,
    "serviceKey": service->key,
    "quote": ${loc('quote')}
  },
  "faqs": *[_type == "faq"] | order(order asc){
    isPlaceholder,
    "key": _id,
    "question": ${loc('question')},
    "answer": ${loc('answer')}
  }
}`;

let cached: SiteContent | null = null;

export async function getSiteContent(): Promise<SiteContent> {
  if (cached) return cached;

  cached =
    sanityConfigured && sanityClient
      ? await sanityClient.fetch<SiteContent>(SITE_CONTENT_QUERY)
      : placeholderContent;

  assertLaunchReady(cached);
  return cached;
}

/**
 * Opt-in launch gate. Set REQUIRE_REAL_CONTENT=true on the production Netlify context
 * so a deploy fails loudly rather than shipping seeded copy to real customers.
 */
function assertLaunchReady(content: SiteContent): void {
  if (import.meta.env.REQUIRE_REAL_CONTENT !== 'true') return;

  const flagged: string[] = [];
  if (content.settings?.isPlaceholder) flagged.push('siteSettings');

  const collections: Array<[string, Array<{ key: string; isPlaceholder?: boolean }>]> = [
    ['service', content.services],
    ['package', content.packages],
    ['addon', content.addons],
    ['galleryItem', content.gallery],
    ['mix', content.mixes],
    ['testimonial', content.testimonials],
    ['faq', content.faqs],
  ];

  for (const [type, items] of collections) {
    for (const item of items ?? []) {
      if (item.isPlaceholder) flagged.push(`${type}:${item.key}`);
    }
  }

  if (flagged.length > 0) {
    throw new Error(
      `Refusing to build: ${flagged.length} document(s) still marked isPlaceholder.\n` +
        flagged.map((entry) => `  - ${entry}`).join('\n')
    );
  }
}
