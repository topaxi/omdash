import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  worker: {
    format: 'es',
  },
  esbuild: {
    target: ['firefox146', 'safari26'],
  },
  build: {
    outDir: 'build',
    target: ['firefox146', 'safari26'],
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});
