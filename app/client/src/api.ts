import type { Level, Policy, QuizQuestion, SourceRef } from '../../shared/types';
import type { CoverageCheck } from '../../shared/verify';

export interface ExtractResponse {
  policy: Policy;
  checks: CoverageCheck[];
  sourceText?: string;
  fallback: boolean;
  cached: boolean;
  error?: string;
  ms?: number;
}

export interface Usage {
  requests: number;
  tokens: number;
  total: { llmCalls: number; cacheHits: number; noLlm: number; inputTokens: number; outputTokens: number };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return r.json();
}

export const api = {
  health: () => fetch('/api/health').then((r) => r.json() as Promise<{ model: string; hasApiKey: boolean }>),
  usage: () => fetch('/api/usage').then((r) => r.json() as Promise<Usage>),
  extractSample: (force = false) => post<ExtractResponse>('/api/extract', { force }),
  extractFile: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/extract', { method: 'POST', body: fd });
    return r.json() as Promise<ExtractResponse>;
  },
  explain: (policy: Policy, coverageId: string, level: Exclude<Level, 'originale'>, mode: 'riformula' | 'esempio', cost?: number) =>
    post<{ text: string; attempts: number; fallback: boolean; cached: boolean; issues: string[] }>('/api/explain', { policy, coverageId, level, mode, cost }),
  quiz: (policy: Policy) => post<{ questions: QuizQuestion[]; fallback: boolean; cached: boolean }>('/api/quiz', { policy }),
  ask: (policy: Policy, question: string, sourceText?: string) =>
    post<{ outOfScope: boolean; answer: string; sources: SourceRef[]; guard?: string; cached?: boolean; fallback?: boolean }>('/api/ask', { policy, question, sourceText }),
};
