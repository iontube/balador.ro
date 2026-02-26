import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://balador.ro',
  trailingSlash: 'always',
  build: {
    format: 'directory'
  },
  integrations: [
    sitemap({
      filter: (page) => {
        // Exclude system pages
        const excludedPages = [
          '/contact/',
          '/politica-cookies/',
          '/politica-de-confidentialitate/',
          '/termeni-si-conditii/'
        ];
        return !excludedPages.some(excluded => page.includes(excluded));
      }
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
