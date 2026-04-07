import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 8000, fs: { allow: [".."] } },
  resolve: {
    alias: {
      labpdf: '../lib/labpdf.js',
    },
  },
});
