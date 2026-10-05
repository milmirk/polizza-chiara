import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

export const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';
export const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

const client = hasApiKey ? new Anthropic() : null;

const promptsDir = new URL('../../../agents/prompts/', import.meta.url);
export const prompt = (name: 'extractor' | 'explainer' | 'quiz-coach' | 'guardian') =>
  readFileSync(new URL(`${name}.md`, promptsDir), 'utf8');

type Effort = 'low' | 'medium' | 'high';
type Content = Anthropic.MessageParam['content'];

function requireClient() {
  if (!client) throw new Error('ANTHROPIC_API_KEY non configurata');
  return client;
}

export async function structured<S extends z.ZodType>(
  system: string,
  content: Content,
  schema: S,
  effort: Effort = 'low',
): Promise<z.infer<S>> {
  const res = await requireClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content }],
    output_config: { format: zodOutputFormat(schema), effort },
  });
  if (res.stop_reason === 'refusal' || !res.parsed_output) {
    throw new Error(`Risposta non valida dal modello (stop_reason: ${res.stop_reason})`);
  }
  return res.parsed_output as z.infer<S>;
}

export async function text(system: string, content: Content, effort: Effort = 'low'): Promise<string> {
  const res = await requireClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content }],
    output_config: { effort },
  });
  if (res.stop_reason === 'refusal') throw new Error('Il modello ha rifiutato la richiesta');
  return res.content
    .flatMap((b) => (b.type === 'text' ? [b.text] : []))
    .join('')
    .trim();
}
