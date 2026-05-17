import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import {viteSingleFile} from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [tsconfigPaths(), react(), tailwindcss(), viteSingleFile()],
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    sourcemap: false,
    assetsInlineLimit: 100000000, // force inline images/fonts/svg
  },
});
