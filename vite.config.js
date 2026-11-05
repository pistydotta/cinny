import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wasm } from '@rollup/plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import inject from '@rollup/plugin-inject';
import topLevelAwait from 'vite-plugin-top-level-await';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';
import buildConfig from './build.config';
import { patchElementCall } from './src/element-call/patchElementCall';

const noiseSuppressor = 'node_modules/@sapphi-red/web-noise-suppressor/dist';
const elementCall = 'node_modules/@element-hq/element-call-embedded/dist';

const copyFiles = {
  targets: [
    {
      src: `${elementCall}/config.json`,
      dest: 'public/element-call',
    },
    {
      src: [`${elementCall}/assets/*`, `!${elementCall}/assets/index-*.js`],
      dest: 'public/element-call/assets',
    },
    {
      // Makes the call layout ask blazeroom-screenshare.js which screen shares to show.
      src: `${elementCall}/assets/index-*.js`,
      dest: 'public/element-call/assets',
      transform: patchElementCall,
    },
    {
      // Loads our mic noise suppression and share state before Element Call's own script.
      src: `${elementCall}/index.html`,
      dest: 'public/element-call',
      transform: (content) => {
        const script = ['blazeroom-noise.js', 'blazeroom-screenshare.js']
          .map((file) => `<script type="module" src="./blazeroom/${file}"></script>`)
          .join('');
        const at = content.indexOf('<script type="module"');
        if (at === -1) throw new Error('Element Call index.html: module script not found');
        return content.slice(0, at) + script + content.slice(at);
      },
    },
    ...[
      { src: 'src/element-call/blazeroom-noise.js' },
      { src: 'src/element-call/micFilter.js' },
      { src: 'src/element-call/blazeroom-screenshare.js' },
      { src: 'src/element-call/shareState.js' },
      { src: 'src/element-call/voiceVolume.js' },
      { src: `${noiseSuppressor}/index.js`, rename: 'noise-suppressor.js' },
      { src: `${noiseSuppressor}/rnnoise/workletProcessor.js`, rename: 'rnnoiseWorklet.js' },
      { src: `${noiseSuppressor}/rnnoise.wasm` },
      { src: `${noiseSuppressor}/rnnoise_simd.wasm` },
    ].map((file) => ({ ...file, dest: 'public/element-call/blazeroom' })),
    {
      src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      dest: '',
      rename: 'pdf.worker.min.js',
    },
    {
      src: 'netlify.toml',
      dest: '',
    },
    {
      src: 'config.json',
      dest: '',
    },
    {
      src: 'public/manifest.json',
      dest: '',
    },
    {
      src: 'public/res/android',
      dest: 'public/',
    },
    {
      src: 'public/locales',
      dest: 'public/',
    },
  ],
};

function serverMatrixSdkCryptoWasm(wasmFilePath) {
  return {
    name: 'vite-plugin-serve-matrix-sdk-crypto-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === wasmFilePath) {
          const resolvedPath = path.join(
            path.resolve(),
            '/node_modules/@matrix-org/matrix-sdk-crypto-wasm/pkg/matrix_sdk_crypto_wasm_bg.wasm'
          );

          if (fs.existsSync(resolvedPath)) {
            res.setHeader('Content-Type', 'application/wasm');
            res.setHeader('Cache-Control', 'no-cache');

            const fileStream = fs.createReadStream(resolvedPath);
            fileStream.pipe(res);
          } else {
            res.writeHead(404);
            res.end('File not found');
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  appType: 'spa',
  publicDir: false,
  base: buildConfig.base,
  server: {
    port: 8080,
    host: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
    fs: {
      // Do not expose the private monorepo's parent directory to the dev server.
      allow: [path.resolve()],
    },
  },
  plugins: [
    serverMatrixSdkCryptoWasm('/node_modules/.vite/deps/pkg/matrix_sdk_crypto_wasm_bg.wasm'),
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: '__tla',
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: (i) => `__tla_${i}`,
    }),
    viteStaticCopy(copyFiles),
    vanillaExtractPlugin(),
    wasm(),
    react(),
    VitePWA({
      srcDir: 'src',
      filename: 'sw.ts',
      strategies: 'injectManifest',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        // Enable esbuild polyfill plugins
        NodeGlobalsPolyfillPlugin({
          process: false,
          buffer: true,
        }),
      ],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    copyPublicDir: false,
    rollupOptions: {
      plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
    },
  },
});
