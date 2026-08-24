// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://jmpartyteam.com',
  output: 'static',
  // Only the routes under /api opt out of prerendering; every page stays static.
  adapter: netlify(),
  i18n: {
    locales: ['bg', 'en'],
    defaultLocale: 'bg',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin'),
      i18n: {
        defaultLocale: 'bg',
        locales: { bg: 'bg-BG', en: 'en' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
