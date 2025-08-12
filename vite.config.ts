import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
// import type {Plugin} from 'vite';

// const coepHeadersPlugin = (): Plugin => ({
//   name: 'html-coep-coop',
//   transformIndexHtml(html) {
//     return html.replace(
//       '<head>',
//       `<head>
//         <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin" />
//         <meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp" />`,
//     );
//   },
// });

// https://vite.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths(), react(), tailwindcss()],
  // build: {
  //   target: 'esnext', // Needed for wasm/worker
  // },
  // optimizeDeps: {
  //   // don't try to pre-optimize these — let them be loaded at runtime
  //   exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  // },
  // server: {
  //   headers: {
  //     'Cross-Origin-Opener-Policy': 'same-origin',
  //     'Cross-Origin-Embedder-Policy': 'require-corp',
  //   },
  // },
});
