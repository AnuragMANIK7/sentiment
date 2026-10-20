import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// PLACEHOLDER: replace with the production URL before deploying.
export default defineConfig({
  site: 'https://shubhlabh.example',
  integrations: [sitemap()],
  prefetch: false,
});
