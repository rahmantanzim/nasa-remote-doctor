import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/  ·  https://vitest.dev/config/  ·  https://vite-pwa-org.netlify.app/
export default defineConfig({
  plugins: [
    react(),
    // Offline-first (SPEC.md §4.3): installable, and after the first load the
    // whole app (code, styles, fonts, icons) is served from the device.
    VitePWA({
      // We register the service worker ourselves (src/offline.ts) to show "Works offline".
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Remote Doctor',
        short_name: 'Remote Doctor',
        description:
          'Daily self-check for astronauts on long missions: what to do next, even when the doctor on Earth is 20 minutes away.',
        theme_color: '#080b10',
        background_color: '#080b10',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // woff2 only: every browser with service workers reads woff2, so the
        // older .woff copies would only add download weight.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: {
    // Logic tests only (sim/, engine/, reports/). No DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
