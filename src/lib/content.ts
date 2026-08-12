import { placeholderContent } from '../content/placeholder';
import { sanityClient, sanityConfigured } from './sanity';
import type { SiteContent } from './types';

const SITE_CONTENT_QUERY = /* groq */ `{
  "settings": *[_type == "siteSettings"][0],
  "services": *[_type == "service"] | order(order asc),
  "packages": *[_type == "package"] | order(priceEur asc),
  "addons": *[_type == "addon"] | order(priceEur asc),
  "gallery": *[_type == "galleryItem"] | order(_createdAt desc),
  "mixes": *[_type == "mix"] | order(_createdAt desc),
  "testimonials": *[_type == "testimonial"] | order(date desc),
  "faqs": *[_type == "faq"] | order(_createdAt asc)
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
