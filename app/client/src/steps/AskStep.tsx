import { useState } from 'react';
import type { Policy, SourceRef } from '../../../shared/types';
import { api } from '../api';
import { Badge, Button, Card, SourceQuote, Speak, Spinner } from '../ui';

const EXAMPLES = [
  'Mi serve la ricetta del medico per la visita?',
  'Entro quando devo mandare le fatture per il rimborso?',
  'Gli occhiali sono coperti?',
  'Mi conviene cambiare polizza?',
  'Ho mal di schiena, devo fare la risonanza?',
];

interface Exchange {
  question: string;
  answer: string;
  outOfScope: boolean;
  sources: SourceRef[];
  guard?: string;
}

export function AskStep({ policy, sourceText, onNext }: { policy: Policy; sourceText?: string; onNext: () => void }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([]);

  const send = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setQuestion('');
    try {
      const r = await api.ask(policy, q, sourceText);
      setHistory((h) => [{ question: q, ...r }, ...h]);
    } catch (e) {
      setHistory((h) => [{ question: q, answer: `Non sono riuscito a rispondere: ${(e as Error).message}`, outOfScope: false, sources: [] }, ...h]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-2xl font-bold">Chiedi alla tua polizza</h2>
        <p className="text-gray-700">Rispondo solo con quello che c'è scritto nella tua polizza. Non do consigli su cosa scegliere e non do consigli medici.</p>
        <form
          onSubmit={(e) => { e.preventDefault(); send(question); }}
          className="flex flex-wrap gap-3"
        >
          <label htmlFor="q" className="sr-only">La tua domanda</label>
          <input
            id="q" value={question} onChange={(e) => setQuestion(e.target.value)}
            placeholder="Scrivi la tua domanda…"
            className="min-h-14 flex-1 rounded-xl border-2 border-gray-400 px-4 text-lg"
          />
          <Button type="submit" disabled={loading || !question.trim()}>Chiedi</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => send(ex)} disabled={loading} className="rounded-full border-2 border-gray-300 px-4 py-2 text-base hover:border-acn">
              {ex}
            </button>
          ))}
        </div>
        {loading && <Spinner label="Cerco nella tua polizza…" />}
      </Card>

      {history.map((h, i) => (
        <Card key={history.length - i} className="space-y-3">
          <p className="text-lg font-semibold text-gray-600">“{h.question}”</p>
          {h.outOfScope && <Badge tone="warn">{h.guard === 'medico' ? 'Domanda medica: fuori dal mio compito' : 'Richiesta di consiglio: fuori dal mio compito'}</Badge>}
          <p className="text-xl leading-relaxed">{h.answer}</p>
          <Speak text={h.answer} />
          {h.sources.map((s, j) => <SourceQuote key={j} source={s} />)}
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={onNext}>Verifica cosa hai imparato →</Button>
      </div>
    </div>
  );
}
