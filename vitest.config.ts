import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    // Os testes padrão exercitam o modo com consentimento; o modo sem está em sem-consentimento.test.tsx.
    env: { VITE_EXIGIR_CONSENTIMENTO: 'true' },
  },
});
