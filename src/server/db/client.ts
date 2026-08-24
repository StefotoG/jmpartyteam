import postgres from 'postgres';

export type Sql = postgres.Sql<{}>;

function resolveUrl(explicit?: string): string {
  const url =
    explicit ??
    process.env.DATABASE_URL ??
    // Astro exposes env through import.meta, which is absent in plain Node scripts.
    (import.meta as { env?: Record<string, string | undefined> }).env?.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and point it at your local PostgreSQL.'
    );
  }
  return url;
}

export function connect(url?: string, options: postgres.Options<{}> = {}): Sql {
  return postgres(resolveUrl(url), {
    // Ranges arrive as strings; the domain layer parses only what it needs.
    types: {},
    onnotice: () => {},
    ...options,
  });
}
