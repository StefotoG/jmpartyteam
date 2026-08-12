/**
 * Seeds a Sanity dataset from src/content/placeholder.ts so the DJs open a Studio that
 * already has the right shape, rather than a blank one.
 *
 * Re-runnable: it first deletes documents flagged isPlaceholder, then recreates them.
 * Real content is never touched, because real content has that flag turned off.
 *
 * Requires a write token (Sanity -> API -> Tokens -> Editor):
 *   SANITY_PROJECT_ID=... SANITY_WRITE_TOKEN=... node scripts/seed-sanity.mjs
 */
import { createClient } from '@sanity/client';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { placeholderContent } from '../src/content/placeholder.ts';

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET ?? 'production';
const token = process.env.SANITY_WRITE_TOKEN;

if (!projectId || !token) {
  console.error(
    'Missing SANITY_PROJECT_ID or SANITY_WRITE_TOKEN. See the header of this file.'
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2026-01-01',
  useCdn: false,
});

/** sanity-plugin-internationalized-array stores values as [{_key, _type, value}]. */
const intl = (type, localized) =>
  ['bg', 'en'].map((lang) => ({
    _key: lang,
    _type: `internationalizedArray${type}Value`,
    value: localized[lang],
  }));

const intlSlug = (localized) =>
  ['bg', 'en'].map((lang) => ({
    _key: lang,
    _type: 'internationalizedArraySlugValue',
    value: { _type: 'slug', current: localized[lang] },
  }));

const assetCache = new Map();

async function uploadImage(publicPath) {
  if (assetCache.has(publicPath)) return assetCache.get(publicPath);

  const filePath = join(process.cwd(), 'public', publicPath.replace(/^\//, ''));
  const buffer = await readFile(filePath);
  const asset = await client.assets.upload('image', buffer, {
    filename: publicPath.split('/').pop(),
  });

  const ref = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
  assetCache.set(publicPath, ref);
  return ref;
}

// Referencing documents must go before the documents they point at.
const DELETE_ORDER = [
  'galleryItem',
  'testimonial',
  'mix',
  'faq',
  'pricePackage',
  'addon',
  'service',
];

for (const type of DELETE_ORDER) {
  await client.delete({ query: `*[_type == $type && isPlaceholder == true]`, params: { type } });
}
console.log('Cleared previously seeded placeholder documents.');

const { settings, services, packages, addons, gallery, mixes, testimonials, faqs } =
  placeholderContent;

await client.createOrReplace({
  _id: 'siteSettings',
  _type: 'siteSettings',
  isPlaceholder: true,
  brandName: settings.brandName,
  phonePrimary: settings.phonePrimary,
  phoneSecondary: settings.phoneSecondary,
  viber: settings.viber,
  whatsapp: settings.whatsapp,
  email: settings.email,
  instagram: settings.instagram,
  facebook: settings.facebook,
  tiktok: settings.tiktok,
  foundingYear: settings.foundingYear,
  eventsCompleted: settings.eventsCompleted,
  cities: intl('StringList', settings.cities),
  addressLocality: intl('String', settings.addressLocality),
});

// Sanity assigns the IDs; references use the IDs it returns.
const serviceIdByKey = new Map();

for (const item of services) {
  const created = await client.create({
    _type: 'service',
    isPlaceholder: true,
    key: item.key,
    order: item.order,
    slug: intlSlug(item.slug),
    title: intl('String', item.title),
    summary: intl('Text', item.summary),
    body: intl('TextList', item.body),
    inclusions: intl('StringList', item.inclusions),
    image: await uploadImage(item.image),
  });
  serviceIdByKey.set(item.key, created._id);
}

const serviceRef = (key) => ({
  _type: 'reference',
  _ref: serviceIdByKey.get(key),
});

for (const item of packages) {
  await client.create({
    _type: 'pricePackage',
    isPlaceholder: true,
    key: item.key,
    priceEur: item.priceEur,
    isFrom: item.isFrom,
    highlighted: item.highlighted,
    name: intl('String', item.name),
    features: intl('StringList', item.features),
  });
}

for (const item of addons) {
  await client.create({
    _type: 'addon',
    isPlaceholder: true,
    key: item.key,
    priceEur: item.priceEur,
    isFrom: item.isFrom,
    name: intl('String', item.name),
  });
}

for (const item of gallery) {
  await client.create({
    _type: 'galleryItem',
    isPlaceholder: true,
    venue: item.venue,
    alt: intl('String', item.alt),
    service: serviceRef(item.serviceKey),
    image: await uploadImage(item.image),
  });
}

for (const item of mixes) {
  await client.create({
    _type: 'mix',
    isPlaceholder: true,
    title: item.title,
    platform: item.platform,
    embedUrl: item.embedUrl || undefined,
    durationMinutes: item.durationMinutes,
    genres: intl('StringList', item.genres),
  });
}

for (const item of testimonials) {
  await client.create({
    _type: 'testimonial',
    isPlaceholder: true,
    author: item.author,
    date: item.date,
    rating: item.rating,
    service: serviceRef(item.serviceKey),
    quote: intl('Text', item.quote),
  });
}

for (const [index, item] of faqs.entries()) {
  await client.create({
    _type: 'faq',
    isPlaceholder: true,
    order: index + 1,
    question: intl('String', item.question),
    answer: intl('Text', item.answer),
  });
}

const total =
  1 +
  services.length +
  packages.length +
  addons.length +
  gallery.length +
  mixes.length +
  testimonials.length +
  faqs.length;

console.log(
  `Seeded ${total} documents and ${assetCache.size} images into ${projectId}/${dataset}.`
);
console.log('All documents are flagged isPlaceholder — replace before launch.');
