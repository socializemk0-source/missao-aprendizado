import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { routes } from '../../src/app/router';
import { AuthTestProvider } from '../../src/auth/AuthProvider';
import type { Me } from '../../src/lib/api';
import { setSupabaseForTests } from '../../src/lib/supabase';

export const session = { access_token: 'tok', user: { id: 'u1' } } as unknown as Session;
export const me: Me = {
  user: { id: 'u1', email: 'maria@teste.dev' },
  profile: { displayName: 'Maria Souza', targetExam: null, preferredBanca: null, city: null },
};

type AuthValue = Parameters<typeof AuthTestProvider>[0]['value'];

export function renderAt(path: string, auth: AuthValue = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <AuthTestProvider value={auth}>
      <RouterProvider router={router} />
    </AuthTestProvider>,
  );
  return { ...utils, router };
}

// Cliente Supabase falso só com o que as telas de login usam.
export function fakeSupabase(overrides: Record<string, unknown> = {}) {
  const auth = {
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
    signUp: vi.fn(async () => ({ data: { user: { identities: [{}] }, session: null }, error: null })),
    signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    updateUser: vi.fn(async () => ({ data: {}, error: null })),
    getSession: vi.fn(async () => ({ data: { session: null } })),
    ...overrides,
  };
  setSupabaseForTests({ auth } as unknown as SupabaseClient);
  return auth;
}
