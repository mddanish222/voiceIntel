import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.jpeg'],
      manifest: {
        name: 'VoiceIntel AI',
        short_name: 'VoiceIntel',
        description: 'AI Speech Intelligence & Transcription',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/icon.jpeg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ]
})