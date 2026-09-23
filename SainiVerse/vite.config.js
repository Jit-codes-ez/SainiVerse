import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();

        try {
          const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const pathname = parsedUrl.pathname;

          if (!res.status) {
            res.status = function (code) {
              this.statusCode = code;
              return this;
            };
          }
          if (!res.json) {
            res.json = function (data) {
              this.setHeader('Content-Type', 'application/json');
              return this.end(JSON.stringify(data));
            };
          }

          req.query = Object.fromEntries(parsedUrl.searchParams.entries());

          if (pathname === '/api/get-music') {
            const { default: handler } = await server.ssrLoadModule('/api/get-music.js');
            return await handler(req, res);
          }

          if (pathname === '/api/get-photo') {
            const { default: handler } = await server.ssrLoadModule('/api/get-photo.js');
            return await handler(req, res);
          }

          if (pathname === '/api/list-photos') {
            const { default: handler } = await server.ssrLoadModule('/api/list-photos.js');
            return await handler(req, res);
          }

          if (pathname === '/api/list-music') {
            const { default: handler } = await server.ssrLoadModule('/api/list-music.js');
            return await handler(req, res);
          }

          if (pathname === '/api/get-upload-url') {
            const { default: handler } = await server.ssrLoadModule('/api/get-upload-url.js');
            let bodyStr = '';
            req.on('data', (chunk) => (bodyStr += chunk));
            req.on('end', async () => {
              try {
                req.body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                req.body = bodyStr;
              }
              await handler(req, res);
            });
            return;
          }

          if (pathname === '/api/delete-file') {
            const { default: handler } = await server.ssrLoadModule('/api/delete-file.js');
            let bodyStr = '';
            req.on('data', (chunk) => (bodyStr += chunk));
            req.on('end', async () => {
              try {
                req.body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                req.body = bodyStr;
              }
              await handler(req, res);
            });
            return;
          }

          if (pathname === '/api/suggest-caption') {
            const { default: handler } = await server.ssrLoadModule('/api/suggest-caption.js');
            let bodyStr = '';
            req.on('data', (chunk) => (bodyStr += chunk));
            req.on('end', async () => {
              try {
                req.body = bodyStr ? JSON.parse(bodyStr) : {};
              } catch {
                req.body = bodyStr;
              }
              await handler(req, res);
            });
            return;
          }
        } catch (err) {
          console.error('API Dev Middleware Error:', err);
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: err.message }));
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});

