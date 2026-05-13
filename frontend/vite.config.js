import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Forward /api requests to the Laravel backend
      // This eliminates all CORS browser restrictions during development
      '/api': {
        target: 'http://edupulse.localhost',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

