import type { LibraryEntry, LibraryMeta, Level, Policy, QuizQuestion, SourceRef } from '../../shared/types';

export type LoadedPolicy = LibraryEntry & { cached?: boolean; ms?: number };

export interface Usage {
  requests: number;
  tokens: number;
  total: { llmCalls: number; cacheHits: number; noLlm: number; inputTokens: number; outputTokens: number };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? r.statusText);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

const post = <T>(url: string, body: unknown) =>
  request<T>(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  health: () => request<{ model: string; hasApiKey: boolean }>('/api/health'),
  usage: () => request<Usage>('/api/usage'),
  library: () => request<LibraryMeta[]>('/api/library'),
  openPolicy: (id: string) => request<LoadedPolicy>(`/api/library/${encodeURIComponent(id)}`),
  uploadPolicy: (file: File, product: string, level: string, name: string) => {
    const fd = new FormData();
    fd.append('product', product);
    fd.append('level', level);
    fd.append('name', name);
    fd.append('file', file);
    return request<LoadedPolicy>('/api/library', { method: 'POST', body: fd });
  },
  reextract: (id: string) => post<LoadedPolicy>(`/api/library/${encodeURIComponent(id)}/reextract`, {}),
  deletePolicy: (id: string) => request<void>(`/api/library/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  explain: (policy: Policy, coverageId: string, level: Exclude<Level, 'originale'>, mode: 'riformula' | 'esempio', cost?: number) =>
    post<{ text: string; attempts: number; fallback: boolean; cached: boolean; issues: string[] }>('/api/explain', { policy, coverageId, level, mode, cost }),
  quiz: (policy: Policy) => post<{ questions: QuizQuestion[]; fallback: boolean; cached: boolean }>('/api/quiz', { policy }),
  ask: (policy: Policy, question: string, sourceText?: string) =>
    post<{ outOfScope: boolean; answer: string; sources: SourceRef[]; guard?: string; cached?: boolean; fallback?: boolean }>('/api/ask', { policy, question, sourceText }),
};
