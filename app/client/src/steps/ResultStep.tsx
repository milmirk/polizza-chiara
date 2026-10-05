import type { QuizResult } from './QuizStep';
import { Button, Card } from '../ui';

function Bar({ label, r, tone }: { label: string; r: QuizResult; tone: string }) {
  const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-lg">
        <span className="font-semibold">{label}</span>
        <span>{r.correct} su {r.total} ({pct}%)</span>
      </div>
      <div className="mt-1 h-6 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const SKILLS = [
  'Sai se una prestazione è coperta o esclusa.',
  'Sai cosa sono franchigia, scoperto e carenza.',
  'Sai calcolare quanto resta a te, in una struttura convenzionata e non.',
  'Sai dove trovare la regola nella polizza (articolo e pagina).',
];

export function ResultStep({ pre, post, onRestart }: { pre: QuizResult; post: QuizResult; onRestart: () => void }) {
  const delta = post.correct / Math.max(post.total, 1) - pre.correct / Math.max(pre.total, 1);
  const levels = ['', 'base', 'intermedio', 'avanzato'];
  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <h2 className="text-3xl font-bold">Cosa hai imparato</h2>
        <Bar label="Prima" r={pre} tone="bg-gray-500" />
        <Bar label="Dopo" r={post} tone="bg-acn" />
        <p className="text-xl">
          {delta > 0
            ? `Le risposte giuste sono passate da ${pre.correct} a ${post.correct}. `
            : delta === 0 ? 'Il punteggio è uguale a prima. ' : ''}
          Hai raggiunto le domande di livello <strong>{levels[post.maxDifficulty]}</strong>
          {pre.maxDifficulty !== post.maxDifficulty ? ` (prima: ${levels[pre.maxDifficulty]})` : ''}.
        </p>
      </Card>

      <Card>
        <h3 className="text-xl font-bold">Adesso sai fare in autonomia</h3>
        <ul className="mt-3 space-y-2 text-lg">
          {SKILLS.map((s) => <li key={s}>✓ {s}</li>)}
        </ul>
        <h3 className="mt-6 text-xl font-bold">Le domande di verifica</h3>
        <ul className="mt-3 space-y-2">
          {post.details.map((d) => (
            <li key={d.id} className="flex gap-3 text-lg">
              <span className={d.correct ? 'text-green-800' : 'text-red-800'}>{d.correct ? '✓' : '✗'}</span>
              <span>{d.question}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="bg-gray-50">
        <p className="text-lg">
          Per decidere cosa fare (dove curarti, se cambiare polizza) parla con il tuo medico o con la tua agenzia. Adesso sai quali domande fare.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onRestart}>Ricomincia</Button>
      </div>
    </div>
  );
}
