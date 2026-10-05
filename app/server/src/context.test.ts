import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Policy } from '../../shared/types';
import sample from '../../data/sample-policy.extracted.json';
import { askContext, keywordAnswer, retrieve, textPassages } from './context';
import { checkAnswer, checkQuestion } from './guardrail';

const policy = sample as Policy;
const doc = readFileSync(new URL('../../data/sample-policy.md', import.meta.url), 'utf8');

describe('retrieve', () => {
  it.each([
    ['Gli occhiali sono coperti?', 'Art. 10 lett. e)'],
    ['Il dentista è coperto?', 'Art. 10 lett. b)'],
    ['Mi serve la ricetta del medico per la visita?', 'Art. 7'],
    ['Entro quando devo mandare le fatture per il rimborso?', 'Art. 11'],
  ])('%s → %s', (q, article) => {
    const top = retrieve(policy, q, doc);
    expect(top.length).toBeGreaterThan(0);
    expect(top.slice(0, 2).map((p) => p.source.article)).toContain(article);
  });

  it('le parole rare pesano di più: "fatture" porta all\'Art. 11', () => {
    expect(retrieve(policy, 'Entro quando devo mandare le fatture per il rimborso?', doc)[0].source.article).toBe('Art. 11');
  });

  it('i passaggi del testo hanno pagina e articolo', () => {
    const art11 = textPassages(doc).find((p) => p.quote.includes('entro 60 giorni'));
    expect(art11).toMatchObject({ page: 5, article: 'Art. 11' });
  });

  it('senza corrispondenze il contesto elenca solo le garanzie', () => {
    const ctx = askContext(policy, 'Che ore sono adesso?', retrieve(policy, 'Che ore sono adesso?', doc));
    expect(ctx).toContain('Nessun passaggio pertinente');
    expect(keywordAnswer([]).sources).toEqual([]);
  });
});

describe('guardrail', () => {
  it.each(['Mi conviene cambiare polizza?', 'Cosa mi consigli?', 'Quale polizza è meglio?'])('blocca la consulenza: %s', (q) => {
    expect(checkQuestion(q)).toMatchObject({ blocked: true, kind: 'consulenza' });
  });

  it.each(['Ho mal di schiena, devo fare la risonanza?', 'Questi sintomi sono gravi?'])('blocca le domande mediche: %s', (q) => {
    expect(checkQuestion(q)).toMatchObject({ blocked: true, kind: 'medico' });
  });

  it.each(['Gli occhiali sono coperti?', 'Entro quando devo mandare le fatture?', 'Cosa devo mandare per il rimborso?'])('lascia passare: %s', (q) => {
    expect(checkQuestion(q).blocked).toBe(false);
  });

  it('filtra i consigli in uscita', () => {
    expect(checkAnswer('Ti conviene andare in una struttura convenzionata.').blocked).toBe(true);
    expect(checkAnswer('In una struttura convenzionata paghi 40 €.').blocked).toBe(false);
  });
});
