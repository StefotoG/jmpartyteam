import { createClient, type SanityClient } from '@sanity/client';

const projectId = import.meta.env.SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET ?? 'production';

export const sanityConfigured = Boolean(projectId);

export const sanityClient: SanityClient | null = sanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2026-01-01',
      // Must bypass the CDN: the publish webhook starts a build within a second, and the
      // CDN can still be serving pre-publish data, which would bake stale content in.
      useCdn: false,
      perspective: 'published',
    })
  : null;
