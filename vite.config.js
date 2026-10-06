import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // swisseph-wasm locates its .wasm/.data via import.meta.url, so keep it out of dep pre-bundling.
  optimizeDeps: { exclude: ['swisseph-wasm'] },
  build: { target: 'es2022' },
});
