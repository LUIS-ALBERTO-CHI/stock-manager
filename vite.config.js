import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo las funciones de /api no existen (viven en Vercel). Con
    // `npm run dev:local` se levanta dev/mock-api.mjs en el 3999 y se usa aquí.
    proxy: {
      '/api': 'http://localhost:3999',
    },
  },
})
