import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "injectManifest",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      injectManifest: {
        injectionPoint: undefined,
      },
      // Disable SW in dev to prevent caching issues
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: "TakeMe - Zdieľané jazdy",
        short_name: "TakeMe",
        description: "Zdieľaj jazdy, šetri peniaze a chráň planétu",
        theme_color: "#3b82f6",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        // Force immediate activation
        skipWaiting: true,
        clientsClaim: true,
        // Only cache static assets, NOT JS bundles
        globPatterns: ["**/*.{ico,png,svg,woff2}"],
        // Don't precache anything in preview/dev-like environments
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Clean old caches on activate
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Cache Mapbox tiles
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            // Network-first for app JS/CSS (always get fresh)
            urlPattern: /\.(js|css|html)$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "app-assets",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour max
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
