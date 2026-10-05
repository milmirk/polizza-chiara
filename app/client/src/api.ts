import type { Level, Policy, QuizQuestion, SimulationInput, SimulationResult, SourceRef } from '../../shared/types';
import type { CoverageCheck } from '../../shared/verify';

export interface ExtractResponse {
  policy: Policy;
  checks: CoverageCheck[];
  sourceText?: string;
  fallback: boolean;
  error?: string;
  ms?: number;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json();
}

export const api = {
  health: () => fetch('/api/health').then((r) => r.json() as Promise<{ model: string; hasApiKey: boolean }>),
  sample: () => fetch('/api/sample').then((r) => r.json() as Promise<ExtractResponse>),
  extractSample: () => post<ExtractResponse>('/api/extract', {}),
  extractFile: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/extract', { method: 'POST', body: fd });
    return r.json() as Promise<ExtractResponse>;
  },
  simulate: (policy: Policy, input: SimulationInput) => post<SimulationResult>('/api/simulate', { policy, input }),
  explain: (policy: Policy, coverageId: string, level: Exclude<Level, 'originale'>, mode: 'riformula' | 'esempio', cost?: number) =>
    post<{ text: string; attempts: number; fallback: boolean; issues: string[] }>('/api/explain', { policy, coverageId, level, mode, cost }),
  quiz: (policy: Policy) => post<{ questions: QuizQuestion[]; fallback: boolean }>('/api/quiz', { policy }),
  ask: (policy: Policy, question: string) =>
    post<{ outOfScope: boolean; answer: string; sources: SourceRef[]; guard?: string }>('/api/ask', { policy, question }),
};
