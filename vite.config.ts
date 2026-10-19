import { defineConfig } from 'vite';

// GitHub Pages serves the site at /subhdate/ ; local dev at /
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/subhdate/' : '/',
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
