import { useEffect, useState } from 'react';
import type { QuizQuestion } from '../../shared/types';
import { api, type LoadedPolicy, type Usage } from './api';
import { AskStep } from './steps/AskStep';
import { CoverageStep } from './steps/CoverageStep';
import { LibraryStep } from './steps/LibraryStep';
import { QuizStep, type QuizResult } from './steps/QuizStep';
import { ResultStep } from './steps/ResultStep';
import { SimulatorStep } from './steps/SimulatorStep';
import { VoicePicker } from './ui';

const STEPS = ['Libreria', 'Quiz iniziale', 'Le garanzie', 'Quanto pago', 'Domande', 'Verifica finale'];
const GROUPS = [
  { title: 'Inizia', steps: [0, 1] },
  { title: 'Esplora quando vuoi', steps: [2, 3, 4] },
  { title: 'Alla fine', steps: [5] },
];
const FONT_SIZES = [19, 22, 25];

export default function App() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<LoadedPolicy | null>(null);
  const [pool, setPool] = useState<QuizQuestion[] | null>(null);
  const [pre, setPre] = useState<QuizResult | null>(null);
  const [post, setPost] = useState<QuizResult | null>(null);
  const [font, setFont] = useState(0);
  const [health, setHealth] = useState<{ model: string; hasApiKey: boolean } | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    const refresh = () => api.usage().then(setUsage).catch(() => undefined);
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[font]}px`;
  }, [font]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const loaded = (d: LoadedPolicy | null) => {
    const samePolicy = d !== null && data !== null && d.id === data.id && d.uploadedAt === data.uploadedAt;
    setData(d);
    if (samePolicy) return;
    setPre(null);
    setPost(null);
    setPool(null);
    if (d) api.quiz(d.policy).then((r) => setPool(r.questions)).catch(() => setPool([]));
  };

  const restart = () => {
    setStep(0);
    setData(null);
    setPool(null);
    setPre(null);
    setPost(null);
  };

  const reachable = (i: number) => i === 0 || data !== null;
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-2 border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-3xl font-bold tracking-tight">
              Polizza Chiara<span className="text-acn">&gt;</span>
            </p>
            <p className="text-gray-600">Capire la tua polizza salute, una cosa alla volta</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
          <VoicePicker />
          <div className="flex items-center gap-2" role="group" aria-label="Dimensione del testo">
            <span className="text-gray-600">Testo</span>
            {FONT_SIZES.map((_, i) => (
              <button
                key={i}
                onClick={() => setFont(i)}
                aria-pressed={font === i}
                className={`h-12 min-w-12 rounded-lg border-2 px-2 font-bold ${font === i ? 'border-acn bg-acn text-white' : 'border-gray-300'}`}
                style={{ fontSize: `${16 + i * 4}px` }}
              >
                A{'+'.repeat(i)}
              </button>
            ))}
          </div>
          </div>
        </div>
        <nav aria-label="Sezioni" className="mx-auto grid max-w-6xl gap-4 px-6 pb-4 md:grid-cols-[2fr_3fr_1fr]">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-gray-500">{g.title}</p>
              <div className="flex gap-2">
                {g.steps.map((i) => {
                  const done = (i === 1 && pre) || (i === 5 && post);
                  return (
                    <button
                      key={i}
                      onClick={() => reachable(i) && setStep(i)}
                      disabled={!reachable(i)}
                      aria-current={i === step ? 'page' : undefined}
                      className={`min-h-12 flex-1 rounded-lg border-b-4 px-3 py-2 text-left text-base ${
                        i === step ? 'border-acn bg-acn/5 font-bold text-ink' : 'border-gray-200 text-gray-700 hover:border-acn-light'
                      } disabled:cursor-not-allowed disabled:text-gray-400`}
                    >
                      {STEPS[i]}
                      {done && <span className="ml-1 text-green-800" aria-label="fatto">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {step === 0 && <LibraryStep data={data} aiAvailable={!!health?.hasApiKey} onLoaded={loaded} onNext={next} />}
        {step === 1 && data && (
          pre ? (
            <div className="space-y-4">
              <p className="text-xl">Hai già fatto il quiz iniziale: {pre.correct} su {pre.total}.</p>
              <button className="text-lg text-acn-dark underline" onClick={() => setStep(2)}>Vai alle garanzie →</button>
            </div>
          ) : (
            <QuizStep
              key="pre"
              pool={pool}
              exclude={[]}
              reveal={false}
              title="Prima di iniziare: quanto ne sai?"
              intro="Rispondi come ti viene. Se non lo sai, scegli “Non lo so”: va benissimo. Serve a capire da dove partiamo."
              onDone={(r) => { setPre(r); next(); }}
            />
          )
        )}
        {step === 2 && data && <CoverageStep policy={data.policy} checks={data.checks} onNext={next} />}
        {step === 3 && data && <SimulatorStep policy={data.policy} onNext={next} />}
        {step === 4 && data && <AskStep policy={data.policy} sourceText={data.sourceText} onNext={next} />}
        {step === 5 && data && (
          post ? (
            <ResultStep pre={pre} post={post} onRestart={restart} />
          ) : (
            <QuizStep
              key="post"
              pool={pool}
              exclude={pre?.ids ?? []}
              reveal
              title="Verifica finale"
              intro="Adesso rispondi di nuovo. Questa volta ti dico subito se è giusto e perché."
              onDone={setPost}
            />
          )
        )}
      </main>

      <footer className="border-t-2 border-gray-200 bg-gray-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-base text-gray-700">
          <p>
            Polizza Chiara ti aiuta a <strong>capire</strong> la tua polizza. Non dà consigli su cosa scegliere né consigli medici.
          </p>
          <p className="text-sm text-gray-500">
            {health ? (health.hasApiKey ? `AI: ${health.model}` : 'Modalità demo (senza AI)') : 'Server non raggiungibile'}
            {usage && usage.requests > 0 && (
              <span title="Richieste servite dalla cache o senza AI non consumano token">
                {' · '}Token AI: {usage.tokens.toLocaleString('it-IT')} · {usage.total.cacheHits + usage.total.noLlm} risposte su {usage.requests} a 0 token
              </span>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
