// @vitest-environment jsdom
// Primeira origem do visitante (UTM e ids de clique): guardada até o aceite, depois por 30 dias.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { capturarOrigem, origemSalva, persistirOrigem, limparOrigemParaTestes } from '../../src/lib/atribuicao';

beforeEach(() => limparOrigemParaTestes());
afterEach(() => limparOrigemParaTestes());

const URL_ANUNCIO = '?utm_source=meta&utm_medium=paid_social&utm_campaign=cadastro_amplo_202610&utm_content=c001-cronograma-v1&fbclid=ABC123&outro=nao';

describe('origem do visitante', () => {
  it('lê os parâmetros conhecidos da URL e ignora o resto', () => {
    capturarOrigem(URL_ANUNCIO);
    expect(origemSalva()).toMatchObject({
      utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: 'cadastro_amplo_202610', utm_content: 'c001-cronograma-v1', fbclid: 'ABC123',
    });
    expect(origemSalva()).not.toHaveProperty('outro');
    expect(typeof origemSalva()!.primeira_visita_em).toBe('string');
  });

  it('sem consentimento, só fica na aba (sessionStorage): nada de cookie nem localStorage', () => {
    capturarOrigem(URL_ANUNCIO);
    expect(document.cookie).not.toContain('at_first_touch');
    expect(localStorage.getItem('aprova-tico:first-touch')).toBeNull();
    expect(sessionStorage.getItem('aprova-tico:first-touch')).not.toBeNull();
  });

  it('depois do aceite, persiste em cookie de primeira parte e localStorage', () => {
    capturarOrigem(URL_ANUNCIO);
    persistirOrigem();
    expect(document.cookie).toContain('at_first_touch');
    expect(localStorage.getItem('aprova-tico:first-touch')).not.toBeNull();
  });

  it('a primeira origem não é sobrescrita por visitas seguintes', () => {
    capturarOrigem('?utm_source=meta&utm_content=c001');
    capturarOrigem('?utm_source=google&utm_content=outra');
    expect(origemSalva()!.utm_source).toBe('meta');
    expect(origemSalva()!.utm_content).toBe('c001');
  });

  it('visita sem parâmetros não cria origem', () => {
    capturarOrigem('');
    expect(origemSalva()).toBeNull();
  });

  it('origem com mais de 30 dias deixa de valer', () => {
    capturarOrigem('?utm_source=meta');
    const velha = { ...origemSalva()!, primeira_visita_em: new Date(Date.now() - 31 * 86400_000).toISOString() };
    sessionStorage.setItem('aprova-tico:first-touch', JSON.stringify(velha));
    expect(origemSalva()).toBeNull();
  });

  it('corta valores enormes (não vira lixo no banco nem nos eventos)', () => {
    capturarOrigem('?utm_content=' + 'x'.repeat(500));
    expect(origemSalva()!.utm_content!.length).toBeLessThanOrEqual(120);
  });
});
