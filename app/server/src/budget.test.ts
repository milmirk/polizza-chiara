import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { simulate } from '../../shared/calculator';
import type { Policy } from '../../shared/types';
import sample from '../../data/sample-policy.extracted.json';
import { askContext, explainContext, quizContext, retrieve } from './context';

const policy = sample as Policy;
const doc = readFileSync(new URL('../../data/sample-policy.md', import.meta.url), 'utf8');
const prompt = (f: string) => readFileSync(new URL(`../../../agents/prompts/${f}.md`, import.meta.url), 'utf8');
const tokens = (s: string) => Math.round(s.length / 4);

const cov = policy.coverages.find((c) => c.id === 'alta_diagnostica')!;
const sims = (['diretta', 'indiretta'] as const).map((regime) =>
  simulate(policy, { coverageId: cov.id, cost: 250, regime, eventDate: '2027-09-01' }),
);
const question = 'Entro quando devo mandare le fatture per il rimborso?';

const naive = {
  semplificatore: `Livello: semplice\nModalità: esempio\nCosto della fattura: 250 €\n\nGaranzia:\n${JSON.stringify(cov, null, 2)}`,
  quiz: `Genera 6 domande: 2 di difficoltà 1, 2 di difficoltà 2, 2 di difficoltà 3.\n\nPolizza:\n${JSON.stringify(policy)}`,
  guardiano: `Polizza strutturata:\n${JSON.stringify(policy)}\n\nTesto completo della polizza:\n<documento>\n${doc}\n</documento>\n\nDomanda: ${question}`,
};
const lean = {
  semplificatore: explainContext(cov, 'semplice', 'esempio', 250, sims),
  quiz: quizContext(policy),
  guardiano: askContext(policy, question, retrieve(policy, question, doc)),
};
const system = { semplificatore: prompt('explainer'), quiz: prompt('quiz-coach'), guardiano: prompt('guardian') };
const budget = { semplificatore: 600, quiz: 1500, guardiano: 700 };

describe('budget di token in ingresso (stima: 4 caratteri ≈ 1 token)', () => {
  const rows = (Object.keys(lean) as (keyof typeof lean)[]).map((agent) => {
    const before = tokens(system[agent] + naive[agent]);
    const after = tokens(system[agent] + lean[agent]);
    return { agent, before, after, saving: `${Math.round((1 - after / before) * 100)}%` };
  });
  console.table(rows);

  it.each(rows)('$agent resta nel budget e consuma meno della versione ingenua', ({ agent, before, after }) => {
    expect(after).toBeLessThan(before);
    expect(after).toBeLessThanOrEqual(budget[agent]);
  });
});
