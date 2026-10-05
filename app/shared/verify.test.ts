import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkText, numbersIn, verifyPolicy } from './verify';
import { nextDifficulty, numericQuestions } from './quiz';
import type { Policy } from './types';
import sample from '../data/sample-policy.extracted.json';

const policy = sample as Policy;
const sourceText = readFileSync(new URL('../data/sample-policy.md', import.meta.url), 'utf8');

describe('verify', () => {
  it('legge i numeri in formato italiano', () => {
    expect(numbersIn('€ 5.000,00 e 25% e € 40,00')).toEqual([5000, 25, 40]);
  });

  it('tutte le citazioni del JSON di esempio sono nel documento e i numeri tornano', () => {
    const checks = verifyPolicy(policy, sourceText);
    for (const c of checks) expect(c.issues, c.coverageId).toEqual([]);
  });

  it('segnala un numero inventato in una spiegazione', () => {
    const cov = policy.coverages.find((c) => c.id === 'alta_diagnostica')!;
    expect(checkText(cov, 'Paghi solo 35 euro.')).toHaveLength(1);
  });
});

describe('quiz', () => {
  it('genera domande numeriche con la risposta giusta calcolata', () => {
    const qs = numericQuestions(policy, '2026-10-10');
    const rm = qs.find((q) => q.id === 'num-alta_diagnostica-indiretta-250')!;
    expect(rm.options[rm.correctIndex]).toBe('80 €');
    expect(new Set(qs.map((q) => q.difficulty))).toEqual(new Set([1, 2, 3]));
  });

  it('adatta la difficoltà', () => {
    expect(nextDifficulty(1, true)).toBe(2);
    expect(nextDifficulty(3, true)).toBe(3);
    expect(nextDifficulty(2, false)).toBe(1);
  });
});
