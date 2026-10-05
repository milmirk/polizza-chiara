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
  const answered = selected !== null;
  const isCorrect = selected === q.correctIndex;

  const answer = (i: number) => {
    if (answered) return;
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
    setCurrent(undefined);
  };

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

      <div className="mt-6 grid gap-3">
        {[...q.options, 'Non lo so'].map((opt, i) => {
          const chosen = selected === i;
          let style = 'border-gray-300 hover:border-acn';
          if (answered && reveal && i === q.correctIndex) style = 'border-green-700 bg-green-50';
          else if (answered && chosen && reveal) style = 'border-red-700 bg-red-50';
          else if (answered && chosen) style = 'border-acn bg-acn/10';
          return (
            <button
              key={opt + i}
              onClick={() => answer(i)}
              disabled={answered}
              className={`min-h-14 rounded-xl border-2 px-5 py-3 text-left text-lg ${i === dontKnow ? 'italic text-gray-600' : ''} ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-6 space-y-3" aria-live="polite">
          {reveal ? (
            <>
              <p className={`text-xl font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                {isCorrect ? 'Giusto!' : selected === dontKnow ? 'Nessun problema, ecco la risposta.' : 'Non proprio.'}
              </p>
              <p className="text-lg">{q.explanation}</p>
              {q.source && <SourceQuote source={q.source} />}
            </>
          ) : (
            <p className="text-lg text-gray-700">Risposta registrata.</p>
          )}
          <Button onClick={next}>{details.length + 1 >= count ? 'Finito' : 'Prossima domanda →'}</Button>
        </div>
      )}
    </Card>
  );
}
