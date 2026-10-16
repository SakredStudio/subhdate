import { defineConfig } from 'vite';

// GitHub Pages serves the site at /subhdate/ ; local dev at /
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/subhdate/' : '/',
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
    include: ['engine/test/**/*.test.ts'],
    testTimeout: 120000,
  },
}));
