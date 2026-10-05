import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import multer from 'multer';
import { simulate } from '../../shared/calculator';
import { numericQuestions } from '../../shared/quiz';
import { checkText, verifyPolicy } from '../../shared/verify';
import type { Level, Policy, QuizQuestion } from '../../shared/types';
import { basicAuth } from './auth';
import { hasApiKey, MODEL, seedCache, structured, text } from './claude';
import { afterAllWaiting, askContext, exampleText, explainContext, keywordAnswer, quizContext, retrieve } from './context';
import { checkAnswer, checkQuestion } from './guardrail';
import { deleteEntry, getEntry, listEntries, saveEntry } from './library';
import { clientDist } from './paths';
import { pdfToText } from './pdf';
import { AskSchema, PolicySchema, QuizSchema } from './schemas';
import { recordNoLlm, resetUsage, usageReport } from './usage';

const dataDir = new URL('../../data/', import.meta.url);
const readData = (f: string) => readFileSync(new URL(f, dataDir), 'utf8');
const SAMPLE_TEXT = readData('sample-policy.md');
const SAMPLE_POLICY: Policy = JSON.parse(readData('sample-policy.extracted.json'));
const SAMPLE_QUIZ: QuizQuestion[] = JSON.parse(readData('sample-quiz.json'));

const extractContent = (doc: string) => [{ type: 'text' as const, text: `<documento>\n${doc}\n</documento>\nEstrai la polizza secondo lo schema.` }];
const quizContent = (p: Policy) => `Genera 6 domande: 2 di difficoltà 1, 2 di difficoltà 2, 2 di difficoltà 3.\n\n${quizContext(p)}`;

seedCache('estrattore', extractContent(SAMPLE_TEXT), SAMPLE_POLICY);
seedCache('quiz', quizContent(SAMPLE_POLICY), { questions: SAMPLE_QUIZ });
if (listEntries().length === 0) {
  saveEntry(
    { product: 'Salute', level: 'Base', name: 'Salute Serena (esempio)', policy: SAMPLE_POLICY, checks: verifyPolicy(SAMPLE_POLICY, SAMPLE_TEXT), sourceText: SAMPLE_TEXT },
    'esempio-salute-serena',
  );
}

const app = express();
app.use(basicAuth());
app.use(express.json({ limit: '20mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

const findCoverage = (policy: Policy, id: string) => {
  const cov = policy.coverages.find((c) => c.id === id);
  if (!cov) throw httpError(404, `Garanzia ${id} non trovata`);
  return cov;
};

const field = (v: unknown, name: string, required = true) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw httpError(400, `Il campo "${name}" è obbligatorio`);
  if (s.length > 80) throw httpError(400, `Il campo "${name}" è troppo lungo`);
  return s;
};

async function readDocument(file?: Express.Multer.File, raw?: string) {
  if (file?.mimetype === 'application/pdf') {
    const sourceText = (await pdfToText(file.buffer)) ?? undefined;
    const content: Parameters<typeof structured>[1] = sourceText
      ? extractContent(sourceText)
      : [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.buffer.toString('base64') } },
          { type: 'text', text: 'Estrai la polizza secondo lo schema.' },
        ];
    return { content, sourceText };
  }
  const sourceText = file ? file.buffer.toString('utf8') : raw;
  if (!sourceText?.trim()) throw httpError(400, 'Carica un PDF o un file di testo con le condizioni di assicurazione');
  return { content: extractContent(sourceText), sourceText };
}

async function extract(content: Parameters<typeof structured>[1], sourceText: string | undefined, force = false) {
  try {
    const { value, cached } = await structured('estrattore', content, PolicySchema, { force });
    const policy = value as Policy;
    return { policy, checks: verifyPolicy(policy, sourceText), cached };
  } catch (err) {
    const msg = (err as Error).message;
    throw httpError(hasApiKey ? 502 : 503, hasApiKey ? `L'analisi con l'AI non è riuscita: ${msg}` : 'Per analizzare nuove polizze serve la chiave API di Anthropic sul server');
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ model: MODEL, hasApiKey });
});

app.get('/api/usage', (_req, res) => {
  res.json(usageReport());
});

app.post('/api/usage/reset', (_req, res) => {
  resetUsage();
  res.json(usageReport());
});

app.get('/api/library', (_req, res) => {
  res.json(listEntries());
});

app.get('/api/library/:id', (req, res) => {
  const entry = getEntry(req.params.id);
  if (!entry) throw httpError(404, 'Polizza non trovata');
  res.json(entry);
});

app.post('/api/library', upload.single('file'), async (req, res) => {
  const started = Date.now();
  const product = field(req.body?.product, 'prodotto');
  const level = field(req.body?.level, 'livello');
  const name = field(req.body?.name, 'nome', false);
  const { content, sourceText } = await readDocument(req.file, req.body?.text);
  const { policy, checks, cached } = await extract(content, sourceText);
  const entry = saveEntry({ product, level, name: name || policy.title, policy, checks, sourceText });
  res.status(201).json({ ...entry, cached, ms: Date.now() - started });
});

app.post('/api/library/:id/reextract', async (req, res) => {
  const started = Date.now();
  const old = getEntry(req.params.id);
  if (!old) throw httpError(404, 'Polizza non trovata');
  if (!old.sourceText) throw httpError(409, 'Per questa polizza non c\'è il testo originale: ricaricala');
  const { policy, checks, cached } = await extract(extractContent(old.sourceText), old.sourceText, true);
  const entry = saveEntry({ ...old, policy, checks }, old.id);
  res.json({ ...entry, cached, ms: Date.now() - started });
});

app.delete('/api/library/:id', (req, res) => {
  if (!deleteEntry(req.params.id)) throw httpError(404, 'Polizza non trovata');
  res.status(204).end();
});

app.post('/api/explain', async (req, res) => {
  const { policy, coverageId, level, mode, cost = 250 } = req.body as {
    policy: Policy; coverageId: string; level: Exclude<Level, 'originale'>; mode: 'riformula' | 'esempio'; cost?: number;
  };
  const cov = findCoverage(policy, coverageId);
  const date = afterAllWaiting(policy);
  const sims = (['diretta', 'indiretta'] as const).map((regime) => simulate(policy, { coverageId, cost, regime, eventDate: date }));
  const extra = mode === 'esempio' ? [cost, ...sims.flatMap((s) => [s.youPay, s.insurerPays])] : [];
  const fallbackText = mode === 'esempio' ? exampleText(policy, cov, cost) : cov.plain?.[level] ?? '';
  const problems = (out: string) => [...checkText(cov, out, extra), ...(checkAnswer(out).blocked ? ['La spiegazione contiene un consiglio.'] : [])];

  if (!hasApiKey) {
    recordNoLlm('semplificatore');
    return res.json({ text: fallbackText, attempts: 0, fallback: true, cached: false, issues: [] });
  }

  const base = explainContext(cov, level, mode, cost, sims);
  let feedback = '';
  let issues: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { value, cached } = await text('semplificatore', base + feedback, { accept: (v) => problems(v).length === 0 });
      issues = problems(value);
      if (issues.length === 0) return res.json({ text: value, attempts: attempt, fallback: false, cached, issues: [] });
      feedback = `\n\nIl verificatore ha scartato la risposta precedente:\n- ${issues.join('\n- ')}\nRiscrivila rispettando le regole.`;
    } catch (err) {
      issues = [(err as Error).message];
      break;
    }
  }
  res.json({ text: fallbackText, attempts: 2, fallback: true, cached: false, issues });
});

app.post('/api/quiz', async (req, res) => {
  const policy = req.body.policy as Policy;
  const numeric = numericQuestions(policy, afterAllWaiting(policy));
  try {
    const { value, cached } = await structured('quiz', quizContent(policy), QuizSchema);
    const conceptual: QuizQuestion[] = value.questions
      .filter((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length)
      .map((q, i) => ({ ...q, id: `llm-${i}`, difficulty: Math.min(Math.max(q.difficulty, 1), 3) as 1 | 2 | 3 }));
    res.json({ questions: [...numeric, ...conceptual], fallback: false, cached });
  } catch (err) {
    console.error('[quiz] fallback:', (err as Error).message);
    recordNoLlm('quiz');
    res.json({ questions: numeric, fallback: true, cached: false });
  }
});

app.post('/api/ask', async (req, res) => {
  const { policy, question, sourceText } = req.body as { policy: Policy; question: string; sourceText?: string };
  const pre = checkQuestion(question);
  if (pre.blocked) {
    recordNoLlm('guardiano');
    return res.json({ outOfScope: true, answer: pre.message, sources: [], guard: pre.kind });
  }
  const passages = retrieve(policy, question, sourceText);
  if (!hasApiKey) {
    recordNoLlm('guardiano');
    return res.json(keywordAnswer(passages));
  }
  try {
    const { value, cached } = await structured('guardiano', askContext(policy, question, passages), AskSchema);
    const post = checkAnswer(value.answer);
    if (post.blocked) return res.json({ outOfScope: true, answer: post.message, sources: [], guard: post.kind });
    res.json({ ...value, cached });
  } catch (err) {
    console.error('[ask] fallback:', (err as Error).message);
    recordNoLlm('guardiano');
    res.json(keywordAnswer(passages));
  }
});

app.use('/api', (_req, _res, next) => next(httpError(404, 'Endpoint non trovato')));

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(join(clientDist, 'index.html')) : next()));
}

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (!err.status || err.status >= 500) console.error(err);
  res.status(err.status ?? 500).json({ error: err.message });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, (err?: Error) => {
  if (err) throw err;
  console.log(`Polizza Chiara su http://localhost:${port} (modello ${MODEL}, API key: ${hasApiKey ? 'sì' : 'no → solo dati verificati'})`);
});
