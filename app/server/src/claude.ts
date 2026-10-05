import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { cacheGet, cacheSet, hashOf } from './cache';
import { recordCacheHit, recordLlm, type Agent } from './usage';

export const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';
const EFFORT = (process.env.CLAUDE_EFFORT ?? 'low') as 'low' | 'medium' | 'high';
export const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

const client = hasApiKey ? new Anthropic() : null;

const PROMPT_FILE: Record<Agent, string> = {
  estrattore: 'extractor',
  semplificatore: 'explainer',
  quiz: 'quiz-coach',
  guardiano: 'guardian',
};
const MAX_TOKENS: Record<Agent, number> = { estrattore: 12000, semplificatore: 1200, quiz: 4000, guardiano: 1500 };

const promptsDir = new URL('../../../agents/prompts/', import.meta.url);
const prompts = new Map<Agent, string>();
const systemPrompt = (agent: Agent) => {
  if (!prompts.has(agent)) prompts.set(agent, readFileSync(new URL(`${PROMPT_FILE[agent]}.md`, promptsDir), 'utf8'));
  return prompts.get(agent)!;
};

type Content = Anthropic.MessageParam['content'];

export const cacheKey = (agent: Agent, content: unknown) => hashOf(agent, MODEL, EFFORT, systemPrompt(agent), content);

export const seedCache = (agent: Agent, content: unknown, value: unknown) => cacheSet(cacheKey(agent, content), value, false);

function requireClient() {
  if (!client) throw new Error('ANTHROPIC_API_KEY non configurata');
  return client;
}

export interface CallOptions<T> {
  force?: boolean;
  accept?: (value: T) => boolean;
}

async function withCache<T>(agent: Agent, content: unknown, run: () => Promise<T>, opts: CallOptions<T> = {}): Promise<{ value: T; cached: boolean }> {
  const key = cacheKey(agent, content);
  const hit = opts.force ? undefined : cacheGet<T>(key);
  if (hit !== undefined) {
    recordCacheHit(agent);
    return { value: hit, cached: true };
  }
  const value = await run();
  if (!opts.accept || opts.accept(value)) cacheSet(key, value);
  return { value, cached: false };
}

export function structured<S extends z.ZodType>(agent: Agent, content: Content, schema: S, opts?: CallOptions<z.infer<S>>) {
  return withCache<z.infer<S>>(agent, content, async () => {
    const res = await requireClient().messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS[agent],
      system: systemPrompt(agent),
      messages: [{ role: 'user', content }],
      output_config: { format: zodOutputFormat(schema), effort: EFFORT },
    });
    recordLlm(agent, res.usage);
    if (res.stop_reason === 'refusal' || !res.parsed_output) {
      throw new Error(`Risposta non valida dal modello (stop_reason: ${res.stop_reason})`);
    }
    return res.parsed_output as z.infer<S>;
  }, opts);
}

export function text(agent: Agent, content: Content, opts?: CallOptions<string>) {
  return withCache<string>(agent, content, async () => {
    const res = await requireClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS[agent],
      system: systemPrompt(agent),
      messages: [{ role: 'user', content }],
      output_config: { effort: EFFORT },
    });
    recordLlm(agent, res.usage);
    if (res.stop_reason === 'refusal') throw new Error('Il modello ha rifiutato la richiesta');
    return res.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
  }, opts);
}
