// Carrega cada rota de api/ compilada, no Node puro e em ESM — como a
// Vercel roda em produção. Pega import sem extensão ou caminho errado
// (ERR_MODULE_NOT_FOUND) antes do deploy, não depois.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '.api-check/api';
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.js')) files.push(full);
  }
})(root);

let failed = 0;
for (const file of files) {
  try {
    const mod = await import(pathToFileURL(file).href);
    if (typeof mod.default !== 'function') throw new Error('sem export default de handler');
    console.log(`ok   /api/${relative(root, file).replace(/\.js$/, '')}`);
  } catch (err) {
    failed++;
    console.error(`FALHOU ${file}: ${err.message}`);
  }
}
if (!files.length) { console.error('nenhuma rota encontrada'); process.exit(1); }
process.exit(failed ? 1 : 0);
