import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    // Os testes padrão exercitam o modo com consentimento; o modo sem está em sem-consentimento.test.tsx.
    // VITE_APP_VERSION: versão do "bundle" nos testes (src/lib/versao.ts).
    env: { VITE_EXIGIR_CONSENTIMENTO: 'true', VITE_APP_VERSION: 'bundle-1' },
  },
});
