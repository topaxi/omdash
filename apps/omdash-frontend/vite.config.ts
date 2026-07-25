import { defineConfig } from 'vite';
import { execFileSync } from 'child_process';
import { resolve } from 'path';

/**
 * Build provenance for the settings view, in the same shape the relay and the
 * clients report (see `src/store/reducers/version.ts`).
 *
 * `OMDASH_GIT_*` takes precedence over asking git so that deploys can pass the
 * commit in explicitly: turbo hashes those variables (see `turbo.json`), which
 * a `git rev-parse` here cannot influence - without them a cache hit would
 * serve an older commit's build, correctly stamped but confusing next to a
 * freshly built relay.
 */
function version() {
  const commit = process.env.OMDASH_GIT_COMMIT || git(['rev-parse', 'HEAD']);
  const committedAt =
    process.env.OMDASH_GIT_COMMITTED_AT || git(['log', '-1', '--format=%ct']);

  if (!commit) {
    return null;
  }

  return { commit, committedAt: Number(committedAt) || 0 };
}

function git(args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __OMDASH_VERSION__: JSON.stringify(version()),
  },
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
