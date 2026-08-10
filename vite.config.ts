import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const NOTE_MIME = "application/x-noteseen";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Windows locks some brand assets; watching them crashes Vite with EBUSY.
    watch: {
      ignored: ["**/brand-right/**", "**/assets/**"],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "icons/*.png",
        "arigato-labs-logo.png",
        "arigato-single-logo.png",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
      },
      // The service worker is verified through `npm run preview`; keeping it out
      // of dev avoids serving stale modules while editing.
      devOptions: {
        enabled: false,
        type: "module",
      },
      manifest: {
        id: "/",
        name: "NoteSeen — fast notes",
        short_name: "NoteSeen",
        description:
          "Open, type, close. NoteSeen saves instantly and keeps every note as a portable .noteseen file you own.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#17171c",
        categories: ["productivity", "utilities"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        launch_handler: {
          client_mode: ["focus-existing", "auto"],
        },
        file_handlers: [
          {
            action: "/app",
            accept: {
              [NOTE_MIME]: [".noteseen"],
              "text/markdown": [".md"],
              "text/plain": [".txt"],
            },
          },
        ],
        shortcuts: [
          { name: "New note", url: "/app?new=1" },
          { name: "Search notes", url: "/app?search=1" },
        ],
        share_target: {
          action: "/app",
          method: "POST",
          enctype: "multipart/form-data",
          params: { title: "title", text: "text", url: "url" },
        },
      },
    }),
  ],
  build: {
    target: "es2022",
  },
});
