import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 6000000 
      },
      manifest: {
        name: "Unimind",
        short_name: "Unimind",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#968aff", 
        theme_color: "#968aff",      
        icons: [
          {
            src: "/images/icon_entry.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/images/icon_download.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});