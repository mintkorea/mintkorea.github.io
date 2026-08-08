import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Deployed at https://mintkorea.github.io/VOCA/ — Vite needs to know it's
// not living at the domain root, or every asset (js/css/icons) 404s.
const BASE_PATH = "/VOCA/";

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "수능 영단어장",
        short_name: "영단어장",
        description: "고1부터 수능까지, 오늘 할 학습을 바로 보여주는 단어장",
        theme_color: "#EAEEF0",
        background_color: "#EAEEF0",
        display: "standalone",
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // cache the app shell so it opens even with flaky campus/school wifi
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});
