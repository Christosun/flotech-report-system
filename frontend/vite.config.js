import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // penting supaya bisa diakses via IP
    port: 5173,        // optional (default memang 5173)
  }
})