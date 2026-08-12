/**
 * Netlify sets CONTEXT to 'production', 'deploy-preview' or 'branch-deploy'.
 * Anything that is not a production deploy must stay out of search results —
 * a preview full of placeholder content must never be indexed.
 */
const context = process.env.CONTEXT ?? 'dev';

export const isProductionDeploy = context === 'production';

/** Escape hatch: set ALLOW_INDEXING=false to keep production hidden until launch day. */
export const allowIndexing =
  isProductionDeploy && process.env.ALLOW_INDEXING !== 'false';
