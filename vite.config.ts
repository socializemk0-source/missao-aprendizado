import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Em desenvolvimento, /api/* executa os mesmos arquivos de api/ que a
// Vercel executa em produção (api/me.ts → /api/me).
function apiRoutes(): Plugin {
  return {
    name: 'api-routes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();
        const file = resolve(server.config.root, `.${url.pathname}.ts`);
        if (!existsSync(file)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Rota não encontrada.' }));
          return;
        }
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body: unknown = raw;
        if (raw && req.headers['content-type']?.includes('application/json')) {
          try { body = JSON.parse(raw); } catch { body = raw; }
        }
        const apiReq = { method: req.method, headers: req.headers, query: Object.fromEntries(url.searchParams), body };
        const apiRes = {
          status(code: number) { res.statusCode = code; return apiRes; },
          json(payload: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(payload)); },
          setHeader(name: string, value: string) { res.setHeader(name, value); },
        };
        try {
          const mod = await server.ssrLoadModule(file);
          await mod.default(apiReq, apiRes);
        } catch (err) {
          console.error(err);
          if (!res.writableEnded) apiRes.status(500).json({ error: 'Erro interno.' });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // As rotas de api/ leem process.env, como na Vercel.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), apiRoutes()],
    build: {
      rolldownOptions: {
        output: {
          // Bibliotecas num arquivo separado: mudam pouco, ficam em cache no
          // navegador entre uma versão do app e outra.
          codeSplitting: {
            groups: [
              { name: (id: string) => (/node_modules[\\/]@supabase/.test(id) ? 'supabase' : null) },
              { name: (id: string) => (id.includes('node_modules') ? 'vendor' : null) },
            ],
          },
        },
      },
    },
  };
});
