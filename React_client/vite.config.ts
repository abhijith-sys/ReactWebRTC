import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window', // Ensure global is defined for browser usage
  },
  resolve: {
    alias: {
      "readable-stream": "vite-compatible-readable-stream"
    },}
})
