// Regras do conferidor de DNS de e-mail (scripts/email-dns.mjs).
import { describe, expect, it } from 'vitest';
import { avaliarDmarc, avaliarSpf } from '../../scripts/email-dns.mjs';

const RUA = 'rua=mailto:report@aprovatico.com.br';

describe('DMARC', () => {
  it('cronograma: p=none é erro; quarantine 25% e 100% são etapas; reject está completo', () => {
    expect(avaliarDmarc(['v=DMARC1; p=none']).erros.join()).toMatch(/p=none/);
    const etapa1 = avaliarDmarc([`v=DMARC1; p=quarantine; pct=25; ${RUA}`]);
    expect([etapa1.erros, etapa1.politica]).toEqual([[], 'p=quarantine pct=25']);
    expect(etapa1.avisos.join()).toMatch(/próxima: pct=100/);
    expect(avaliarDmarc([`v=DMARC1; p=quarantine; pct=100; ${RUA}`]).avisos.join()).toMatch(/próxima: p=reject/);
    expect(avaliarDmarc([`v=DMARC1; p=reject; ${RUA}`])).toMatchObject({ erros: [], avisos: [], politica: 'p=reject' });
  });

  it('sem relatório, dois registros, pct ou sp errados → erro', () => {
    expect(avaliarDmarc(['v=DMARC1; p=reject']).erros.join()).toMatch(/rua/);
    expect(avaliarDmarc([]).erros).toEqual(['sem registro DMARC']);
    expect(avaliarDmarc([`v=DMARC1; p=reject; ${RUA}`, 'v=DMARC1; p=none']).erros.join()).toMatch(/mais de um/);
    expect(avaliarDmarc([`v=DMARC1; p=quarantine; pct=0; ${RUA}`]).erros.join()).toMatch(/pct/);
    expect(avaliarDmarc([`v=DMARC1; p=reject; sp=none; ${RUA}`]).erros.join()).toMatch(/sp=none/);
  });
});

describe('SPF', () => {
  it('~all é aviso; -all ok; +all, ?all ou sem all é erro', () => {
    const atual = avaliarSpf(['v=spf1 include:spf.improvmx.com ~all']);
    expect(atual.erros).toEqual([]);
    expect(atual.avisos.join()).toMatch(/-all/);
    expect(avaliarSpf(['v=spf1 include:spf.improvmx.com -all'])).toMatchObject({ erros: [], avisos: [] });
    for (const r of ['v=spf1 include:spf.improvmx.com +all', 'v=spf1 include:spf.improvmx.com ?all', 'v=spf1 include:spf.improvmx.com']) {
      expect([r, avaliarSpf([r]).erros.length]).toEqual([r, 1]);
    }
  });

  it('dois registros SPF, include faltando ou mais de 10 consultas → erro', () => {
    expect(avaliarSpf(['v=spf1 -all', 'v=spf1 include:spf.improvmx.com -all']).erros.join()).toMatch(/mais de um/);
    expect(avaliarSpf(['v=spf1 include:_spf.google.com -all']).erros.join()).toMatch(/spf\.improvmx\.com/);
    const muitos = `v=spf1 include:spf.improvmx.com ${Array.from({ length: 10 }, (_, i) => `include:x${i}.com`).join(' ')} -all`;
    expect(avaliarSpf([muitos]).erros.join()).toMatch(/11 consultas/);
  });
});
