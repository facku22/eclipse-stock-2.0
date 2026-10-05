import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  icons: [
  {
    src: '/pwa-192x192.svg',
    sizes: '192x192',
    type: 'image/svg+xml'
  },
  {
    src: '/pwa-512x512.svg',
    sizes: '512x512',
    type: 'image/svg+xml'
  }
]
})