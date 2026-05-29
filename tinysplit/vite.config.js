import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // GitHub Pages serves this project site under /moneyspendingmanagement/.
    // Dev server stays at root so localhost:5173 works unchanged.
    base: command === 'build' ? '/moneyspendingmanagement/' : '/',
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // Proxy Anthropic API calls and inject API key server-side.
        // The browser fetches '/api/anthropic/...' and never sees the key.
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.ANTHROPIC_API_KEY) {
                proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY);
                proxyReq.setHeader('anthropic-version', '2023-06-01');
              }
            });
            proxy.on('error', (err) => {
              console.error('[anthropic-proxy] error:', err.message);
            });
          },
        },
      },
    },
  };
});
