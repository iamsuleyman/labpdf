import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 8000 },
  resolve: {
    alias: {
      labpdf: '../lib/labpdf.js',
    },
  },
});
