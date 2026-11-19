import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Leiteveien',
        short_name: 'Leiteveien',
        description: 'Shared house finance and project tracker',
        theme_color: '#aa3bff',
        background_color: '#f5f4f8',
        display: 'standalone',
      },
    }),
  ],
})
