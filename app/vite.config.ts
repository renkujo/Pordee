import { reactRouter } from "@react-router/dev/vite";
import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    lingui(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.ico",
        "brand/icon-32.png",
        "brand/icon-180.png",
        "brand/icon-192.png",
        "brand/icon-512.png",
        "brand/icon-maskable-512.png",
        "logo/direct/pordee-logo-mark-direct-01.png",
      ],
      manifest: {
        name: "พอดี",
        short_name: "Pordee",
        description: "เงินพอดี ชีวิตเบาขึ้น",
        lang: "th",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#EAF7FF",
        theme_color: "#EAF7FF",
        icons: [
          {
            src: "/brand/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/brand/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/brand/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,woff2,png,svg,ico}"],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkOnly",
            options: {
              precacheFallback: {
                fallbackURL: "/offline.html",
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
