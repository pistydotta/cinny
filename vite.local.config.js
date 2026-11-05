// Local integration frontend: reuses the existing bze2e Docker services.
import { mergeConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import base from './vite.config';

const origin = 'http://127.0.0.1:8082';
export default mergeConfig(base, {
  cacheDir: 'node_modules/.vite-local',
  server: {
    host: '127.0.0.1',
    port: 8082,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3999', changeOrigin: true },
      '/_matrix': { target: 'http://127.0.0.1:8008', changeOrigin: true },
      '/_synapse': { target: 'http://127.0.0.1:8008', changeOrigin: true },
    },
  },
  plugins: [
    {
      name: 'blazeroom-local-config',
      enforce: 'pre',
      transform(code, id) {
        // The isolated test server uses a .test Matrix ID without public DNS.
        if (id.endsWith('/pages/client/AutoDiscovery.tsx'))
          return code.replace('server ?? userId', 'baseUrl');
        return undefined;
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/local-sfu/')) {
            try {
              let body = '';
              // This runs in Node; no browser iterator polyfill is bundled.
              // eslint-disable-next-line no-restricted-syntax
              for await (const chunk of req) {
                body += chunk.toString();
                if (body.length > 65536) {
                  res.statusCode = 413;
                  res.end();
                  return;
                }
              }
              const upstream = await fetch(
                `http://127.0.0.1:8091${req.url.slice('/local-sfu'.length)}`,
                {
                  method: req.method,
                  headers: { 'Content-Type': 'application/json' },
                  ...(body ? { body } : {}),
                  signal: AbortSignal.timeout(15000),
                }
              );
              const data = await upstream.json();
              if (upstream.ok && data.url) data.url = 'ws://127.0.0.1:7880';
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } catch {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: 'local_voice_unavailable' }));
            }
            return;
          }
          if (req.url.split('?')[0].endsWith('/matrix_sdk_crypto_wasm_bg.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
            fs.createReadStream(
              path.resolve(
                'node_modules/@matrix-org/matrix-sdk-crypto-wasm/pkg/matrix_sdk_crypto_wasm_bg.wasm'
              )
            ).pipe(res);
            return;
          }
          const configs = {
            '/config.json': {
              defaultHomeserver: 0,
              homeserverList: [origin],
              allowCustomHomeservers: false,
              hashRouter: { enabled: false, basename: '/' },
              featuredCommunities: { openAsDefault: false, spaces: [], rooms: [], servers: [] },
            },
            '/.well-known/matrix/client': {
              'm.homeserver': { base_url: origin },
              'org.matrix.msc4143.rtc_foci': [
                { type: 'livekit', livekit_service_url: `${origin}/local-sfu` },
              ],
            },
          };
          const config = configs[req.url];
          if (!config) {
            next();
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(config));
        });
      },
    },
  ],
});
