import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `pnpm build` makes a normal static build in dist/.
// `pnpm build:single` inlines everything into one self-contained HTML file.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
  },
  server: { host: true },
}));
