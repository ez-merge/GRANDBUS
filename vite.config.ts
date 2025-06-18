import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  server: {
    host: true, // Add this to expose the server to the network
    port: 5173,
    strictPort: true, // Add this to ensure the port is always 5173
    fs: {
      strict: false,
      allow: ['.']
    }
  },
  define: {
    'process.env': {}
  }
});