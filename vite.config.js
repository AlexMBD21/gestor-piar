import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function localYoutubeApiPlugin() {
  return {
    name: 'local-youtube-resolve-api',
    configureServer(server) {
      server.middlewares.use('/api/youtube-resolve', async (req, res, next) => {
        if (req.method !== 'POST' && req.method !== 'OPTIONS') return next();
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString('utf8');
          req.body = raw ? JSON.parse(raw) : {};
          const { default: handler } = await import('./api/youtube-resolve.js');
          const resAdapter = {
            setHeader: (k, v) => res.setHeader(k, v),
            status(code) {
              res.statusCode = code;
              return this;
            },
            json(payload) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
            end(body = '') {
              res.end(body);
            }
          };
          await handler(req, resAdapter);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err?.message || err) }));
        }
      });
    }
  };
}

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'Gemini_', 'GEMINI_'],
  optimizeDeps: {
    include: ['pptxgenjs']
  },
  plugins: [
    localYoutubeApiPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
        navigateFallbackDenylist: [/^\/api\//]
      },
      manifest: {
        name: 'Gestor PIAR',
        short_name: 'PIAR',
        description: 'Gestor de PIAR Offline-First',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
