/**
 * Seeds a Sanity dataset from src/content/placeholder.ts so the DJs open a Studio that
 * already has the right shape, rather than a blank one. Idempotent: document IDs are
 * derived from content keys, so re-running updates instead of duplicating.
 *
 * Requires a write token (Sanity project -> API -> Tokens -> Editor):
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

const slug = (current) => ({ _type: 'slug', current });

const { settings, services, packages, addons, gallery, mixes, testimonials, faqs } =
  placeholderContent;

const documents = [];

documents.push({ _id: 'siteSettings', _type: 'siteSettings', ...settings });

for (const service of services) {
  documents.push({
    _id: `service-${service.key}`,
    _type: 'service',
    isPlaceholder: service.isPlaceholder,
    key: service.key,
    order: service.order,
    title: service.title,
    summary: service.summary,
    body: service.body,
    inclusions: service.inclusions,
    slug: { bg: slug(service.slug.bg), en: slug(service.slug.en) },
    image: await uploadImage(service.image),
  });
}

for (const item of packages) {
  documents.push({ _id: `package-${item.key}`, _type: 'pricePackage', ...item });
}

for (const item of addons) {
  documents.push({ _id: `addon-${item.key}`, _type: 'addon', ...item });
}

for (const item of gallery) {
  documents.push({
    _id: `gallery-${item.key}`,
    _type: 'galleryItem',
    isPlaceholder: item.isPlaceholder,
    key: item.key,
    alt: item.alt,
    serviceKey: item.serviceKey,
    venue: item.venue,
    image: await uploadImage(item.image),
  });
}

for (const item of mixes) {
  documents.push({ _id: `mix-${item.key}`, _type: 'mix', ...item });
}

for (const item of testimonials) {
  documents.push({
    _id: `testimonial-${item.key}`,
    _type: 'testimonial',
    ...item,
  });
}

for (const item of faqs) {
  documents.push({ _id: `faq-${item.key}`, _type: 'faq', ...item });
}

const transaction = documents.reduce(
  (tx, doc) => tx.createOrReplace(doc),
  client.transaction()
);

await transaction.commit();

console.log(
  `Seeded ${documents.length} documents and ${assetCache.size} images into ${projectId}/${dataset}.`
);
console.log('All documents are flagged isPlaceholder — replace before launch.');
