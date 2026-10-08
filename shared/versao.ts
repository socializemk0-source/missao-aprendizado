// Versão do build: o commit que a Vercel publicou (VERCEL_GIT_COMMIT_SHA,
// disponível no build e nas Functions). Sem ele (npm run dev), "dev".
// A mesma conta no navegador (embutida no bundle) e no servidor
// (/api/config/supabase → version): se diferem, o app aberto é de um deploy
// anterior (src/lib/versao.ts decide quando recarregar).

export function versaoDoBuild(env: Record<string, string | undefined>): string {
  return (env.VERCEL_GIT_COMMIT_SHA?.trim() || 'dev').slice(0, 12);
}

// <meta name="app-version"> no index.html: o HTML muda a cada deploy de
// código novo, então o ETag também muda (o navegador nunca fica com a página
// de um deploy anterior).
export function versaoNoHtml(html: string, versao: string): string {
  const meta = `<meta name="app-version" content="${versao.replace(/[^a-z0-9.-]/gi, '')}" />`;
  return html.replace(/<meta name="app-version"[^>]*>\s*/i, '').replace(/<head>/i, `<head>\n    ${meta}`);
}
