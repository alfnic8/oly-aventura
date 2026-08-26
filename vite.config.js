import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    open: true,
  },
  plugins: [
    VitePWA({
      /* prompt = no auto page reload when a new SW is ready */
      registerType: 'prompt',
      includeAssets: ['assets/**/*', 'icons/**/*'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,mp3,wav,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        /* Do not skipWaiting/clientsClaim — avoids controllerchange reload mid-menu */
      },
      manifest: {
        name: 'Oly Aventura',
        short_name: 'Oly Aventura',
        description: 'El juego de Olympia en el castillo de hadas',
        theme_color: '#0a0014',
        background_color: '#0a0014',
        display: 'standalone',
        orientation: 'landscape',
        lang: 'es',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
