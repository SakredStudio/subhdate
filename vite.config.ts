import { defineConfig } from 'vite';

// Served at the root of https://shubhdate.sakredstudio.ca (GitHub Pages custom domain, public/CNAME)
export default defineConfig(({ mode }) => ({
  base: '/',
  root: 'app',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
  },
  worker: { format: 'es' },
  test: {
    root: '.',
    include: ['engine/test/**/*.test.ts', 'worker/test/**/*.test.ts'],
    testTimeout: 120000,
  },
}));
