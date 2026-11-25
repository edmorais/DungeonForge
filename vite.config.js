import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// `pnpm build` makes a normal static build in dist/.
// `pnpm build:single` inlines everything into one self-contained HTML file.
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  // the web app's manifest, icons and offline worker (public/) belong to the normal build only
  publicDir: mode === 'single' ? false : 'public',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
  },
  server: { host: true },
}));
