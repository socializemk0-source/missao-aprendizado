// Confere que nenhum segredo foi parar no que vai para o navegador (dist/).
// Procura:
//   1. o VALOR de cada variável secreta presente no ambiente (no CI, o build
//      roda com valores "canário" nelas: se algum aparecer no dist, vazou);
//   2. formatos de chave: JWT (eyJ…), chave secreta nova do Supabase
//      (sb_secret_…), o texto "service_role", chave da OpenAI (sk-…), token do
//      Mercado Pago (APP_USR-…/TEST-…) e os nomes das variáveis secretas.
// A chave pública (anon) não está no bundle: vem de /api/config/supabase.
// Uso: npm run build && node scripts/check-bundle.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SECRETAS = [
  'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'TURNSTILE_SECRET_KEY', 'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET',
  'OPENAI_API_KEY', 'SQL_PASSWORD', 'SUPABASE_DB_URL', 'BACKUP_PASSPHRASE', 'RESEND_API_KEY',
];
const FORMATOS = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /sb_secret_[A-Za-z0-9_-]{8,}/,
  /service_role/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /APP_USR-\d{6,}/,
  /TEST-\d{6,}-/,
  new RegExp(`\\b(${SECRETAS.join('|')})\\b`),
];

function arquivos(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? arquivos(p) : [p];
  });
}

const valores = SECRETAS.map((k) => [k, process.env[k]?.trim()]).filter(([, v]) => v && v.length >= 8);
const achados = [];
for (const arquivo of arquivos('dist')) {
  if (!/\.(js|css|html|json|webmanifest|txt|xml|map)$/.test(arquivo)) continue;
  const texto = readFileSync(arquivo, 'utf8');
  for (const [nome, valor] of valores) if (texto.includes(valor)) achados.push(`${arquivo}: valor de ${nome}`);
  for (const formato of FORMATOS) {
    const m = formato.exec(texto);
    if (m) achados.push(`${arquivo}: ${formato} → ${m[0].slice(0, 12)}…`);
  }
}

if (achados.length) {
  console.error('Segredo no bundle do navegador:\n' + achados.join('\n'));
  process.exit(1);
}
console.log(`ok   dist/ sem segredos (${valores.length} valores de variáveis secretas conferidos)`);
