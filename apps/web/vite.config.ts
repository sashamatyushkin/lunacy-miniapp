import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages раздаёт проект из подпапки, локальная разработка — из корня.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    // One tunnel serves both the Mini App and the bot webhook: /api is proxied
    // to Fastify, so the frontend talks to its own origin and CORS never applies.
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('motion')) return 'motion';
          if (id.includes('@tanstack')) return 'query';
          return 'vendor';
        },
      },
    },
  },
});
