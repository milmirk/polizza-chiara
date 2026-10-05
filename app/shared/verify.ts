import type { Coverage, Policy } from './types';

export interface CoverageCheck {
  coverageId: string;
  quotesFound: boolean;
  numbersConsistent: boolean;
  issues: string[];
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[’'`]/g, "'").replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

export function numbersIn(text: string): number[] {
  const matches = text.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g) ?? [];
  return matches.map((m) => {
    const it = /\.\d{3}/.test(m) ? m.replace(/\./g, '').replace(',', '.') : m.replace(',', '.');
    return Number(it);
  });
}

function allowedNumbers(cov: Coverage): Set<number> {
  const set = new Set<number>([cov.waitingDays, cov.annualLimit ?? 0, 0, 1, 2, 3]);
  for (const t of [cov.diretta, cov.indiretta]) {
    if (t) [t.deductible, t.copayPercent, t.copayMin].forEach((n) => set.add(n));
  }
  for (const s of cov.source) numbersIn(s.quote).forEach((n) => set.add(n));
  if (cov.waitingDays % 30 === 0) set.add(cov.waitingDays / 30);
  return set;
}

export function checkText(cov: Coverage, text: string, extra: number[] = []): string[] {
  const allowed = allowedNumbers(cov);
  extra.forEach((n) => allowed.add(n));
  return numbersIn(text)
    .filter((n) => !allowed.has(n))
    .map((n) => `Il numero ${n} non compare nelle condizioni della garanzia "${cov.name}".`);
}

export function verifyPolicy(policy: Policy, sourceText?: string): CoverageCheck[] {
  const src = sourceText ? normalize(sourceText) : null;
  return policy.coverages.map((cov) => {
    const issues: string[] = [];
    let quotesFound = true;
    if (src) {
      for (const s of cov.source) {
        if (!src.includes(normalize(s.quote))) {
          quotesFound = false;
          issues.push(`Citazione non trovata alla lettera nel documento: "${s.quote.slice(0, 80)}…"`);
        }
      }
    }
    if (cov.plain) {
      issues.push(...checkText(cov, cov.plain.semplice), ...checkText(cov, cov.plain.medio));
    }
    const numbersConsistent = !issues.some((i) => i.startsWith('Il numero'));
    return { coverageId: cov.id, quotesFound, numbersConsistent, issues };
  });
}
