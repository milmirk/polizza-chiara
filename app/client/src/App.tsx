import { useEffect, useState } from 'react';
import type { QuizQuestion } from '../../shared/types';
import { api, type ExtractResponse } from './api';
import { AskStep } from './steps/AskStep';
import { CoverageStep } from './steps/CoverageStep';
import { PolicyStep } from './steps/PolicyStep';
import { QuizStep, type QuizResult } from './steps/QuizStep';
import { ResultStep } from './steps/ResultStep';
import { SimulatorStep } from './steps/SimulatorStep';

const STEPS = ['La polizza', 'Quanto ne sai', 'Le garanzie', 'Quanto pago', 'Domande', 'Verifica'];
const FONT_SIZES = [19, 22, 25];

export default function App() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ExtractResponse | null>(null);
  const [pool, setPool] = useState<QuizQuestion[] | null>(null);
  const [pre, setPre] = useState<QuizResult | null>(null);
  const [post, setPost] = useState<QuizResult | null>(null);
  const [font, setFont] = useState(0);
  const [health, setHealth] = useState<{ model: string; hasApiKey: boolean } | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[font]}px`;
  }, [font]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const loaded = (d: ExtractResponse) => {
    setData(d);
    setPool(null);
    api.quiz(d.policy).then((r) => setPool(r.questions)).catch(() => setPool([]));
  };

  const restart = () => {
    setStep(0);
    setData(null);
    setPool(null);
    setPre(null);
    setPost(null);
  };

  const reachable = (i: number) => i === 0 || (data !== null && (i === 1 || pre !== null));
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
        <nav aria-label="Percorso" className="mx-auto max-w-6xl px-6 pb-4">
          <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STEPS.map((s, i) => (
              <li key={s}>
                <button
                  onClick={() => reachable(i) && setStep(i)}
                  disabled={!reachable(i)}
                  aria-current={i === step ? 'step' : undefined}
                  className={`w-full rounded-lg border-b-4 px-2 py-2 text-left text-base ${
                    i === step ? 'border-acn font-bold text-ink' : i < step ? 'border-acn-light text-gray-700' : 'border-gray-200 text-gray-500'
                  } disabled:cursor-not-allowed`}
                >
                  <span className="block text-sm">{i + 1}</span>
                  {s}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {step === 0 && <PolicyStep data={data} onLoaded={loaded} onNext={next} />}
        {step === 1 && data && (
          pre ? (
            <div className="space-y-4">
              <p className="text-xl">Hai già fatto il quiz iniziale: {pre.correct} su {pre.total}.</p>
              <button className="text-lg text-acn-dark underline" onClick={next}>Vai alle garanzie →</button>
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
        {step === 5 && data && pre && (
          post ? (
            <ResultStep pre={pre} post={post} onRestart={restart} />
          ) : (
            <QuizStep
              key="post"
              pool={pool}
              exclude={pre.ids}
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
          </p>
        </div>
      </footer>
    </div>
  );
}
