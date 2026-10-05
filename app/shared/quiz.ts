import { simulate } from './calculator';
import type { Policy, QuizQuestion, Regime } from './types';

const eur = (n: number) => `${n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

interface Scenario {
  coverageId: string;
  label: string;
  cost: number;
  regime: Regime;
  difficulty: 1 | 2 | 3;
}

const SCENARIOS: Scenario[] = [
  { coverageId: 'alta_diagnostica', label: 'una risonanza magnetica', cost: 250, regime: 'diretta', difficulty: 1 },
  { coverageId: 'visite_specialistiche', label: 'una visita cardiologica', cost: 120, regime: 'diretta', difficulty: 1 },
  { coverageId: 'alta_diagnostica', label: 'una risonanza magnetica', cost: 250, regime: 'indiretta', difficulty: 2 },
  { coverageId: 'visite_specialistiche', label: 'una visita ortopedica', cost: 150, regime: 'indiretta', difficulty: 2 },
  { coverageId: 'ricovero', label: 'un intervento in day hospital', cost: 4000, regime: 'indiretta', difficulty: 3 },
  { coverageId: 'alta_diagnostica', label: 'una TAC', cost: 600, regime: 'indiretta', difficulty: 3 },
];

const where = (r: Regime) =>
  r === 'diretta' ? 'in una struttura convenzionata' : 'in una struttura NON convenzionata';

function distractors(cost: number, correct: number, cov: Policy['coverages'][number], regime: Regime): number[] {
  const t = cov[regime]!;
  const pool = [
    0,
    cost,
    t.deductible,
    t.copayMin,
    Math.round((cost * t.copayPercent) / 100 * 100) / 100,
    cost - correct,
  ].filter((n) => n !== correct && n >= 0);
  return [...new Set(pool)].slice(0, 3);
}

export function numericQuestions(policy: Policy, eventDate: string): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const s of SCENARIOS) {
    const cov = policy.coverages.find((c) => c.id === s.coverageId);
    if (!cov?.covered || !cov[s.regime]) continue;
    const r = simulate(policy, { coverageId: s.coverageId, cost: s.cost, regime: s.regime, eventDate });
    if (!r.covered) continue;
    const wrong = distractors(s.cost, r.youPay, cov, s.regime);
    if (wrong.length < 2) continue;
    const values = [r.youPay, ...wrong];
    const order = values.map((v, i) => ({ v, k: (v * 7919 + i * 31) % 97 })).sort((a, b) => a.k - b.k).map((x) => x.v);
    out.push({
      id: `num-${s.coverageId}-${s.regime}-${s.cost}`,
      question: `Fai ${s.label} ${where(s.regime)}. La fattura è di ${eur(s.cost)}. Quanto resta da pagare a te?`,
      options: order.map(eur),
      correctIndex: order.indexOf(r.youPay),
      explanation: r.steps.slice(1).map((st) => st.detail).join(' '),
      difficulty: s.difficulty,
      source: cov.source[0],
    });
  }
  return out;
}

export function nextDifficulty(current: 1 | 2 | 3, lastCorrect: boolean): 1 | 2 | 3 {
  if (lastCorrect) return Math.min(current + 1, 3) as 1 | 2 | 3;
  return Math.max(current - 1, 1) as 1 | 2 | 3;
}
