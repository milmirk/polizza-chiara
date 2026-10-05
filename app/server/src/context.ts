import { simulate } from '../../shared/calculator';
import type { Coverage, Policy, SimulationResult, SourceRef } from '../../shared/types';

const ref = (s: SourceRef) => `[${s.article}${s.page ? `, p.${s.page}` : ''}] ${s.quote}`;

export const addDays = (iso: string, days: number) =>
  new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
export const afterAllWaiting = (p: Policy) => addDays(p.startDate, 365);

const terms = (c: Coverage) => ({
  covered: c.covered,
  limit: c.annualLimit,
  waitDays: c.waitingDays,
  diretta: c.diretta,
  indiretta: c.indiretta,
});

export function explainContext(cov: Coverage, level: 'semplice' | 'medio', mode: 'riformula' | 'esempio', cost: number, sims: SimulationResult[]): string {
  const facts =
    mode === 'esempio'
      ? `\nRisultati del motore (usa questi numeri):\n${sims
          .map((s, i) => `- ${i ? 'indiretta' : 'diretta'}: ${s.covered ? `tu ${s.youPay} €, compagnia ${s.insurerPays} €` : s.reason}`)
          .join('\n')}`
      : `\nSpiegazione da riformulare: ${cov.plain?.[level] ?? ''}`;
  return [
    `Livello: ${level}. Modalità: ${mode}. Fattura: ${cost} €.`,
    `Garanzia "${cov.name}": ${JSON.stringify(terms(cov))}`,
    `Testo originale:\n${cov.source.map(ref).join('\n')}`,
  ].join('\n') + facts;
}

export function quizContext(policy: Policy): string {
  return [
    `Polizza "${policy.title}", decorrenza ${policy.startDate}, preesistenze escluse: ${policy.preexistingExcluded ? 'sì' : 'no'}.`,
    'Garanzie:',
    ...policy.coverages.map((c) => `- ${c.name} ${JSON.stringify(terms(c))}\n${c.source.map(ref).join('\n')}`),
    'Esclusioni:',
    ...policy.exclusions.map((e) => `- ${ref(e.source)}`),
    'Definizioni:',
    ...policy.glossary.flatMap((g) => (g.source ? [`- ${g.term}: ${ref(g.source)}`] : [])),
  ].join('\n');
}

export interface Passage {
  kind: 'esclusione' | 'garanzia' | 'termine' | 'testo';
  label: string;
  source: SourceRef;
  score: number;
}

const STOP = new Set(['sono', 'della', 'delle', 'nella', 'nelle', 'quando', 'come', 'cosa', 'questa', 'questo', 'polizza', 'coperto', 'coperti', 'coperta', 'coperte', 'devo', 'posso', 'anche', 'quanto']);
const stem = (w: string) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 5);
const words = (t: string) => t.split(/[^\p{L}]+/u).filter((w) => w.length >= 4);

export function textPassages(sourceText?: string): SourceRef[] {
  if (!sourceText) return [];
  const out: SourceRef[] = [];
  let page: number | null = null;
  let article = '';
  for (const raw of sourceText.split(/\n|(?<=[.;:])\s+(?=[A-Z(]|[a-g]\))/)) {
    const line = raw.trim();
    const p = line.match(/^--- Pagina (\d+) ---$/);
    if (p) { page = Number(p[1]); continue; }
    const a = line.match(/Art\. \d+/);
    if (a && /^#+\s*Art\.|^Art\. \d+\s*[–-]/.test(line)) {
      article = a[0];
      if (line.startsWith('#') || line.length < 80) continue;
    }
    if (line.length > 30 && !line.startsWith('#')) out.push({ quote: line.replace(/\*\*/g, '').replace(/^[-*]\s*/, ''), page, article });
  }
  return out;
}

export function retrieve(policy: Policy, question: string, sourceText?: string, k = 6): Passage[] {
  const q = [...new Set(words(question).filter((w) => !STOP.has(w.toLowerCase())).map(stem))];
  const units = [
    ...policy.exclusions.map((e) => ({ kind: 'esclusione' as const, label: e.plain ?? e.text, source: e.source, text: `${e.text} ${e.plain ?? ''} ${e.source.quote}` })),
    ...policy.coverages.flatMap((c) => c.source.map((s) => ({ kind: 'garanzia' as const, label: c.name, source: s, text: `${c.name} ${c.examples.join(' ')} ${s.quote}` }))),
    ...policy.glossary.flatMap((g) => (g.source ? [{ kind: 'termine' as const, label: `${g.term}: ${g.definition}`, source: g.source, text: `${g.term} ${g.definition}` }] : [])),
    ...textPassages(sourceText).map((s) => ({ kind: 'testo' as const, label: '', source: s, text: s.quote })),
  ].map((u) => ({ ...u, stems: new Set(words(u.text).map(stem)) }));
  const idf = new Map(q.map((w) => [w, Math.log(1 + units.length / (1 + units.filter((u) => u.stems.has(w)).length))]));
  const all: Passage[] = units.map(({ kind, label, source, stems }) => ({
    kind, label, source,
    score: q.reduce((s, w) => s + (stems.has(w) ? idf.get(w)! : 0), 0),
  }));
  return all
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((p, i, arr) => arr.findIndex((x) => x.source.quote === p.source.quote) === i)
    .slice(0, k);
}

export function askContext(policy: Policy, question: string, passages: Passage[]): string {
  const body = passages.length
    ? passages.map((p) => `- ${p.kind}${p.kind === 'garanzia' ? ` "${p.label}"` : ''}: ${ref(p.source)}`).join('\n')
    : `Nessun passaggio pertinente trovato. Garanzie della polizza: ${policy.coverages.map((c) => c.name).join('; ')}.`;
  return `Passaggi della polizza "${policy.title}" pertinenti alla domanda:\n${body}\n\nDomanda: ${question}`;
}

export function keywordAnswer(passages: Passage[]) {
  const best = passages.filter((p) => p.score >= (passages[0]?.score ?? 0)).slice(0, 2);
  if (best.length === 0) {
    return { outOfScope: false, answer: 'Non ho trovato questo argomento nella tua polizza. Prova con altre parole, oppure chiedi alla tua agenzia.', sources: [] as SourceRef[], fallback: true };
  }
  const top = best[0];
  const answer =
    top.kind === 'esclusione' ? `Questo è tra le cose che la polizza NON copre: ${top.label}`
      : top.kind === 'garanzia' ? `Ne parla la garanzia "${top.label}". Ecco il testo della polizza.`
        : top.kind === 'testo' ? `Ecco cosa dice la tua polizza (${top.source.article}).`
          : top.label;
  return { outOfScope: false, answer: `${answer} (Ricerca nel testo, senza AI.)`, sources: best.map((p) => p.source), fallback: true };
}

export function exampleText(policy: Policy, cov: Coverage, cost: number): string {
  const date = afterAllWaiting(policy);
  const parts = [`Esempio: la fattura è di ${cost} €.`];
  for (const regime of ['diretta', 'indiretta'] as const) {
    const r = simulate(policy, { coverageId: cov.id, cost, regime, eventDate: date });
    const where = regime === 'diretta' ? 'In una struttura convenzionata' : 'In una struttura non convenzionata';
    parts.push(r.covered ? `${where} paghi tu ${r.youPay} €, la compagnia paga ${r.insurerPays} €.` : `${where}: ${r.reason}`);
  }
  return parts.join(' ');
}
