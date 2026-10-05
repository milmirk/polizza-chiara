export type Agent = 'estrattore' | 'semplificatore' | 'quiz' | 'guardiano';

export interface UsageRow {
  llmCalls: number;
  cacheHits: number;
  noLlm: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

const AGENTS: Agent[] = ['estrattore', 'semplificatore', 'quiz', 'guardiano'];
const empty = (): UsageRow => ({ llmCalls: 0, cacheHits: 0, noLlm: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });
const rows = new Map<Agent, UsageRow>(AGENTS.map((a) => [a, empty()]));

export function recordLlm(agent: Agent, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null }) {
  const r = rows.get(agent)!;
  r.llmCalls++;
  r.inputTokens += u.input_tokens;
  r.outputTokens += u.output_tokens;
  r.cacheReadTokens += u.cache_read_input_tokens ?? 0;
}

export const recordCacheHit = (agent: Agent) => void rows.get(agent)!.cacheHits++;
export const recordNoLlm = (agent: Agent) => void rows.get(agent)!.noLlm++;

export function usageReport() {
  const agents = Object.fromEntries(AGENTS.map((a) => [a, { ...rows.get(a)! }])) as Record<Agent, UsageRow>;
  const total = AGENTS.reduce((t, a) => {
    const r = rows.get(a)!;
    (Object.keys(t) as (keyof UsageRow)[]).forEach((k) => (t[k] += r[k]));
    return t;
  }, empty());
  const requests = total.llmCalls + total.cacheHits + total.noLlm;
  return { agents, total, requests, tokens: total.inputTokens + total.outputTokens };
}

export function resetUsage() {
  AGENTS.forEach((a) => rows.set(a, empty()));
}
