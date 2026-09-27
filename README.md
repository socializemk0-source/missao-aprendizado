# Missão Aprendizado V2

Estudo para concursos públicos em forma de aventura, com o Tico: trilha guiada
com questões no estilo das bancas, redação com IA, missões diárias e ranking.

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha com os dados do Supabase
npm run dev            # http://localhost:5173
```

## Deploy (Vercel)

1. Importe este repositório na Vercel (framework **Vite**, detectado sozinho).
2. Em *Settings → Environment Variables*, cadastre as variáveis de `.env.example`
   (os mesmos valores do V1).
3. No Supabase, rode as migrações de `supabase/migrations/` em ordem (SQL Editor).
4. No Supabase, em *Authentication → URL Configuration → Redirect URLs*, adicione
   `https://SEU-DOMINIO-V2/**` (login com Google, confirmação e troca de senha).

## Etapas

1. **Esqueleto** — rotas, layout, login (e-mail, Google, recuperar senha), perfil, CI
2. Trilha e motor de questões — XP, vidas, progresso na nuvem
3. Revisar erros, missões diárias, conquistas, ranking
4. Redação com IA
5. Planos e pagamento (Mercado Pago)
6. Acabamento e acessibilidade

Regras do projeto: [CLAUDE.md](CLAUDE.md).
