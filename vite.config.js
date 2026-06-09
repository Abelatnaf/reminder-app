import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Ensure the service worker is not transformed/bundled — it must stay
  // at the root URL (/sw.js) with its own scope.
  publicDir: 'public',

  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },

  build: {
    // Emit source maps for easier debugging on device
    sourcemap: false,
    // Increase chunk warning threshold — framer-motion is large
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor libs for better caching. Vite 8 (Rolldown) requires the
        // function form of manualChunks, not the object map.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor'
          if (id.includes('framer-motion')) return 'motion'
        },
      },
    },
  },
})
