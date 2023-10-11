import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  worker: {
    format: 'es',
  },
  esbuild: {
    target: ['firefox118', 'safari17'],
  },
  build: {
    outDir: 'build',
    target: ['firefox118', 'safari17'],
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});
