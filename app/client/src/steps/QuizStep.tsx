import { useMemo, useState } from 'react';
import { nextDifficulty } from '../../../shared/quiz';
import type { QuizQuestion } from '../../../shared/types';
import { Badge, Button, Card, SourceQuote, Speak, Spinner } from '../ui';

export interface QuizResult {
  correct: number;
  total: number;
  maxDifficulty: number;
  ids: string[];
  details: { id: string; question: string; difficulty: number; correct: boolean }[];
}

type Level = 1 | 2 | 3;

function pick(pool: QuizQuestion[], used: Set<string>, d: Level): QuizQuestion | undefined {
  const free = pool.filter((q) => !used.has(q.id));
  for (const delta of [0, -1, 1, -2, 2]) {
    const q = free.find((x) => x.difficulty === d + delta);
    if (q) return q;
  }
  return free[0];
}

const LEVEL_LABEL: Record<Level, string> = { 1: 'base', 2: 'intermedio', 3: 'avanzato' };

export function QuizStep({
  pool, exclude, count = 4, reveal, title, intro, onDone,
}: {
  pool: QuizQuestion[] | null;
  exclude: string[];
  count?: number;
  reveal: boolean;
  title: string;
  intro: string;
  onDone: (r: QuizResult) => void;
}) {
  const [level, setLevel] = useState<Level>(1);
  const [details, setDetails] = useState<QuizResult['details']>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const used = useMemo(() => new Set([...exclude, ...details.map((d) => d.id)]), [exclude, details]);
  const [current, setCurrent] = useState<QuizQuestion | undefined>();
  const q = current ?? (pool ? pick(pool, used, level) : undefined);

  if (!pool) return <Card><Spinner label="Preparo le domande…" /></Card>;

  const finished = details.length >= count || !q;
  if (finished) {
    const correct = details.filter((d) => d.correct).length;
    return (
      <Card className="text-center">
        <h2 className="text-2xl font-bold">{title}: fatto</h2>
        <p className="mt-2 text-xl">Risposte giuste: <strong>{correct} su {details.length}</strong></p>
        {!reveal && <p className="mt-2 text-gray-700">Non ti preoccupare: adesso vediamo insieme la tua polizza, una cosa alla volta.</p>}
        <Button
          className="mt-6"
          onClick={() => onDone({ correct, total: details.length, maxDifficulty: Math.max(...details.map((d) => d.difficulty), 1), ids: details.map((d) => d.id), details })}
        >
          Avanti →
        </Button>
      </Card>
    );
  }

  const dontKnow = q.options.length;
  const isCorrect = selected === q.correctIndex;
  const isLast = details.length + 1 >= count;

  const choose = (i: number) => {
    if (confirmed) return;
    setSelected(i);
    setCurrent(q);
  };

  const next = () => {
    const ok = selected === q.correctIndex;
    const nd = nextDifficulty(level, ok);
    setNote(nd > level ? 'Bene! Proviamo una domanda un po’ più difficile.' : nd < level ? 'Proviamo una domanda più semplice.' : null);
    setDetails((d) => [...d, { id: q.id, question: q.question, difficulty: q.difficulty, correct: ok }]);
    setLevel(nd);
    setSelected(null);
    setConfirmed(false);
    setCurrent(undefined);
  };

  const confirm = () => (reveal ? setConfirmed(true) : next());

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          <Badge tone="info">Livello {LEVEL_LABEL[q.difficulty as Level]}</Badge>
          <span className="text-gray-600">Domanda {details.length + 1} di {count}</span>
        </div>
      </div>
      {details.length === 0 && <p className="mt-2 text-gray-700">{intro}</p>}
      {note && <p className="mt-2 font-semibold text-acn-dark" aria-live="polite">{note}</p>}

      <div className="mt-6 flex items-start justify-between gap-4">
        <p className="text-2xl font-semibold leading-snug">{q.question}</p>
        <Speak text={`${q.question} ${q.options.join('. ')}`} />
      </div>

      <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Risposte">
        {[...q.options, 'Non lo so'].map((opt, i) => {
          const chosen = selected === i;
          let style = 'border-gray-300 hover:border-acn';
          if (confirmed && i === q.correctIndex) style = 'border-green-700 bg-green-50';
          else if (confirmed && chosen) style = 'border-red-700 bg-red-50';
          else if (chosen) style = 'border-acn bg-acn/10 ring-2 ring-acn';
          return (
            <button
              key={opt + i}
              role="radio"
              aria-checked={chosen}
              onClick={() => choose(i)}
              disabled={confirmed}
              className={`flex min-h-14 items-center gap-3 rounded-xl border-2 px-5 py-3 text-left text-lg ${i === dontKnow ? 'italic text-gray-600' : ''} ${style}`}
            >
              <span aria-hidden className={`h-6 w-6 shrink-0 rounded-full border-2 ${chosen ? 'border-acn bg-acn shadow-[inset_0_0_0_4px_white]' : 'border-gray-400'}`} />
              {opt}
            </button>
          );
        })}
      </div>

      {!confirmed && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button onClick={confirm} disabled={selected === null}>
            {reveal ? 'Conferma risposta' : isLast ? 'Conferma e finisci' : 'Conferma e vai avanti →'}
          </Button>
          <span className="text-gray-600">{selected === null ? 'Scegli una risposta.' : 'Puoi ancora cambiare idea prima di confermare.'}</span>
        </div>
      )}

      {confirmed && (
        <div className="mt-6 space-y-3" aria-live="polite">
          <p className={`text-xl font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
            {isCorrect ? 'Giusto!' : selected === dontKnow ? 'Nessun problema, ecco la risposta.' : 'Non proprio.'}
          </p>
          <p className="text-lg">{q.explanation}</p>
          {q.source && <SourceQuote source={q.source} />}
          <Button onClick={next}>{isLast ? 'Finito' : 'Prossima domanda →'}</Button>
        </div>
      )}
    </Card>
  );
}
