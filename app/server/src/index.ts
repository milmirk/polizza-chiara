import { readFileSync } from 'node:fs';
import express from 'express';
import multer from 'multer';
import { simulate } from '../../shared/calculator';
import { numericQuestions } from '../../shared/quiz';
import { checkText, verifyPolicy } from '../../shared/verify';
import type { Coverage, Level, Policy, QuizQuestion, SourceRef } from '../../shared/types';
import { hasApiKey, MODEL, prompt, structured, text } from './claude';
import { checkAnswer, checkQuestion } from './guardrail';
import { AskSchema, PolicySchema, QuizSchema } from './schemas';

const dataDir = new URL('../../data/', import.meta.url);
const readData = (f: string) => readFileSync(new URL(f, dataDir), 'utf8');
const SAMPLE_TEXT = readData('sample-policy.md');
const SAMPLE_POLICY: Policy = JSON.parse(readData('sample-policy.extracted.json'));
const SAMPLE_QUIZ: QuizQuestion[] = JSON.parse(readData('sample-quiz.json'));

const app = express();
app.use(express.json({ limit: '20mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const addDays = (iso: string, days: number) =>
  new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
const afterAllWaiting = (p: Policy) => addDays(p.startDate, 365);

function findCoverage(policy: Policy, id: string): Coverage {
  const cov = policy.coverages.find((c) => c.id === id);
  if (!cov) throw Object.assign(new Error(`Garanzia ${id} non trovata`), { status: 404 });
  return cov;
}

app.get('/api/health', (_req, res) => {
  res.json({ model: MODEL, hasApiKey });
});

app.get('/api/sample', (_req, res) => {
  res.json({ policy: SAMPLE_POLICY, checks: verifyPolicy(SAMPLE_POLICY, SAMPLE_TEXT), sourceText: SAMPLE_TEXT, fallback: true });
});

app.post('/api/extract', upload.single('file'), async (req, res) => {
  const started = Date.now();
  const file = req.file;
  const isPdf = file?.mimetype === 'application/pdf';
  const sourceText: string | undefined = file
    ? isPdf ? undefined : file.buffer.toString('utf8')
    : req.body?.text || SAMPLE_TEXT;

  const instruction = 'Estrai la polizza secondo lo schema. Ricorda: citazioni alla lettera, numeri esatti, spiegazioni semplici fedeli.';
  const content = isPdf
    ? [
        { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: file!.buffer.toString('base64') } },
        { type: 'text' as const, text: instruction },
      ]
    : [{ type: 'text' as const, text: `<documento>\n${sourceText}\n</documento>\n\n${instruction}` }];

  try {
    const policy = (await structured(prompt('extractor'), content, PolicySchema, 'medium')) as Policy;
    res.json({ policy, checks: verifyPolicy(policy, sourceText), sourceText, fallback: false, model: MODEL, ms: Date.now() - started });
  } catch (err) {
    console.error('[extract] fallback:', (err as Error).message);
    res.json({
      policy: SAMPLE_POLICY,
      checks: verifyPolicy(SAMPLE_POLICY, SAMPLE_TEXT),
      sourceText: SAMPLE_TEXT,
      fallback: true,
      error: (err as Error).message,
    });
  }
});

app.post('/api/simulate', (req, res) => {
  res.json(simulate(req.body.policy as Policy, req.body.input));
});

function exampleFallback(policy: Policy, cov: Coverage, cost: number): string {
  const date = afterAllWaiting(policy);
  const parts = [`Esempio: la fattura è di ${cost} €.`];
  for (const regime of ['diretta', 'indiretta'] as const) {
    const r = simulate(policy, { coverageId: cov.id, cost, regime, eventDate: date });
    const where = regime === 'diretta' ? 'In una struttura convenzionata' : 'In una struttura non convenzionata';
    parts.push(r.covered ? `${where} paghi tu ${r.youPay} €, la compagnia paga ${r.insurerPays} €.` : `${where}: ${r.reason}`);
  }
  return parts.join(' ');
}

app.post('/api/explain', async (req, res) => {
  const { policy, coverageId, level, mode, cost = 250 } = req.body as {
    policy: Policy; coverageId: string; level: Exclude<Level, 'originale'>; mode: 'riformula' | 'esempio'; cost?: number;
  };
  const cov = findCoverage(policy, coverageId);
  const date = afterAllWaiting(policy);
  const sims = (['diretta', 'indiretta'] as const).map((regime) => simulate(policy, { coverageId, cost, regime, eventDate: date }));
  const extra = mode === 'esempio' ? [cost, ...sims.flatMap((s) => [s.youPay, s.insurerPays])] : [];
  const fallbackText = mode === 'esempio' ? exampleFallback(policy, cov, cost) : cov.plain?.[level] ?? '';

  if (!hasApiKey) return res.json({ text: fallbackText, attempts: 0, fallback: true, issues: [] });

  const facts =
    mode === 'esempio'
      ? `\n\nRisultati calcolati dal motore (usa questi numeri, non ricalcolarli):\n${sims
          .map((s, i) => `- ${i === 0 ? 'forma diretta' : 'forma indiretta'}: ${s.covered ? `paghi tu ${s.youPay} €, la compagnia paga ${s.insurerPays} €` : s.reason}`)
          .join('\n')}`
      : '';
  const base = `Livello: ${level}\nModalità: ${mode}\nCosto della fattura: ${cost} €\n\nGaranzia:\n${JSON.stringify(cov, null, 2)}${facts}`;

  let feedback = '';
  let issues: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = await text(prompt('explainer'), base + feedback);
      issues = [...checkText(cov, out, extra), ...(checkAnswer(out).blocked ? ['La spiegazione contiene un consiglio.'] : [])];
      if (issues.length === 0) return res.json({ text: out, attempts: attempt, fallback: false, issues: [] });
      feedback = `\n\nIl verificatore ha scartato la tua risposta precedente:\n- ${issues.join('\n- ')}\nRiscrivila rispettando le regole.`;
    } catch (err) {
      issues = [(err as Error).message];
      break;
    }
  }
  res.json({ text: fallbackText, attempts: 2, fallback: true, issues });
});

app.post('/api/quiz', async (req, res) => {
  const policy = req.body.policy as Policy;
  const numeric = numericQuestions(policy, afterAllWaiting(policy));
  if (!hasApiKey) return res.json({ questions: [...numeric, ...SAMPLE_QUIZ], fallback: true });
  try {
    const out = await structured(
      prompt('quiz-coach'),
      `Genera 6 domande: 2 di difficoltà 1, 2 di difficoltà 2, 2 di difficoltà 3.\n\nPolizza:\n${JSON.stringify(policy)}`,
      QuizSchema,
    );
    const conceptual: QuizQuestion[] = out.questions
      .filter((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length)
      .map((q, i) => ({ ...q, id: `llm-${i}`, difficulty: Math.min(Math.max(q.difficulty, 1), 3) as 1 | 2 | 3 }));
    res.json({ questions: [...numeric, ...conceptual], fallback: false });
  } catch (err) {
    console.error('[quiz] fallback:', (err as Error).message);
    res.json({ questions: [...numeric, ...SAMPLE_QUIZ], fallback: true });
  }
});

const STOP = new Set(['sono', 'della', 'delle', 'nella', 'nelle', 'quando', 'come', 'cosa', 'questa', 'questo', 'polizza', 'coperto', 'coperti', 'coperta', 'coperte', 'devo', 'posso', 'anche']);
const stem = (w: string) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 5);

function textPassages(sourceText?: string): SourceRef[] {
  if (!sourceText) return [];
  const out: SourceRef[] = [];
  let page: number | null = null;
  let article = '';
  for (const raw of sourceText.split('\n')) {
    const line = raw.trim();
    const p = line.match(/^--- Pagina (\d+) ---$/);
    if (p) { page = Number(p[1]); continue; }
    const a = line.match(/^#+\s*(Art\. \d+)/);
    if (a) { article = a[1]; continue; }
    if (line.length > 30 && !line.startsWith('#')) out.push({ quote: line.replace(/^[-*]\s*/, '').replace(/\*\*/g, ''), page, article });
  }
  return out;
}

function keywordAnswer(policy: Policy, question: string, sourceText?: string) {
  const words = question.split(/[^\p{L}]+/u).filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase())).map(stem);
  const score = (t: string) => {
    const ts = new Set(t.split(/[^\p{L}]+/u).filter((w) => w.length >= 4).map(stem));
    return words.filter((w) => ts.has(w)).length;
  };
  const candidates = [
    ...policy.exclusions.map((e) => ({ kind: 'esclusione' as const, label: e.plain ?? e.text, source: e.source, s: score(`${e.text} ${e.plain ?? ''} ${e.source.quote}`) })),
    ...policy.coverages.flatMap((c) => c.source.map((src) => ({ kind: 'garanzia' as const, label: c.name, source: src, s: score(`${c.name} ${c.examples.join(' ')} ${src.quote}`) }))),
    ...policy.glossary.flatMap((g) => (g.source ? [{ kind: 'termine' as const, label: `${g.term}: ${g.definition}`, source: g.source, s: score(`${g.term} ${g.definition}`) }] : [])),
    ...textPassages(sourceText).map((src) => ({ kind: 'testo' as const, label: '', source: src, s: score(src.quote) })),
  ]
    .filter((c) => c.s > 0)
    .sort((a, b) => b.s - a.s)
    .filter((c, i, all) => all.findIndex((x) => x.source.quote === c.source.quote) === i && c.s >= all[0].s)
    .slice(0, 2);

  if (candidates.length === 0) {
    return { outOfScope: false, answer: 'Non ho trovato questo argomento nella tua polizza. Prova con altre parole, oppure chiedi alla tua agenzia.', sources: [], fallback: true };
  }
  const top = candidates[0];
  const answer =
    top.kind === 'esclusione'
      ? `Questo è tra le cose che la polizza NON copre: ${top.label}`
      : top.kind === 'garanzia'
        ? `Ne parla la garanzia "${top.label}". Ecco il testo della polizza.`
        : top.kind === 'testo'
          ? `Ecco cosa dice la tua polizza (${top.source.article}).`
          : top.label;
  return { outOfScope: false, answer: `${answer} (Ricerca nel testo, senza AI.)`, sources: candidates.map((c) => c.source), fallback: true };
}

app.post('/api/ask', async (req, res) => {
  const { policy, question, sourceText } = req.body as { policy: Policy; question: string; sourceText?: string };
  const pre = checkQuestion(question);
  if (pre.blocked) return res.json({ outOfScope: true, answer: pre.message, sources: [], guard: pre.kind });
  if (!hasApiKey) return res.json(keywordAnswer(policy, question, sourceText));
  const doc = sourceText ? `\n\nTesto completo della polizza:\n<documento>\n${sourceText}\n</documento>` : '';
  let out;
  try {
    out = await structured(prompt('guardian'), `Polizza strutturata:\n${JSON.stringify(policy)}${doc}\n\nDomanda: ${question}`, AskSchema);
  } catch (err) {
    console.error('[ask] fallback:', (err as Error).message);
    return res.json(keywordAnswer(policy, question, sourceText));
  }
  const post = checkAnswer(out.answer);
  if (post.blocked) return res.json({ outOfScope: true, answer: post.message, sources: [], guard: post.kind });
  res.json({ ...out, sources: out.sources as SourceRef[] });
});

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`Polizza Chiara API su http://localhost:${port} (modello ${MODEL}, API key: ${hasApiKey ? 'sì' : 'no → fallback'})`));
