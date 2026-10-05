import { useMemo, useState } from 'react';
import { simulate } from '../../../shared/calculator';
import type { Policy, Regime } from '../../../shared/types';
import { Button, Card, SourceQuote, Speak, eur } from '../ui';

const today = () => new Date().toISOString().slice(0, 10);

const PRESETS = [
  { label: 'La risonanza di Rosa', coverageId: 'alta_diagnostica', cost: 250 },
  { label: 'Il day hospital di Rosa', coverageId: 'ricovero', cost: 4000 },
  { label: 'Una visita dal cardiologo', coverageId: 'visite_specialistiche', cost: 120 },
];

export function SimulatorStep({ policy, onNext }: { policy: Policy; onNext: () => void }) {
  const [coverageId, setCoverageId] = useState(policy.coverages.find((c) => c.id === 'alta_diagnostica')?.id ?? policy.coverages[0].id);
  const [cost, setCost] = useState(250);
  const [regime, setRegime] = useState<Regime>('indiretta');
  const [eventDate, setEventDate] = useState(today());
  const [used, setUsed] = useState(0);

  const result = useMemo(
    () => simulate(policy, { coverageId, cost, regime, eventDate, alreadyReimbursedThisYear: used }),
    [policy, coverageId, cost, regime, eventDate, used],
  );
  const cov = policy.coverages.find((c) => c.id === coverageId)!;
  const youPct = cost > 0 ? Math.round((result.youPay / cost) * 100) : 0;
  const summary = `Paghi tu ${eur(result.youPay)}. Paga la compagnia ${eur(result.insurerPays)}.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {PRESETS.filter((p) => policy.coverages.some((c) => c.id === p.coverageId)).map((p) => (
          <Button key={p.label} variant="secondary" onClick={() => { setCoverageId(p.coverageId); setCost(p.cost); }}>
            {p.label} ({eur(p.cost)})
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-6">
          <fieldset>
            <legend className="text-xl font-bold">1. Cosa devi fare?</legend>
            <select
              value={coverageId}
              onChange={(e) => setCoverageId(e.target.value)}
              className="mt-3 w-full rounded-xl border-2 border-gray-400 px-4 py-3 text-lg"
            >
              {policy.coverages.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.examples.length ? ` (es. ${c.examples.slice(0, 2).join(', ')})` : ''}</option>
              ))}
            </select>
          </fieldset>

          <fieldset>
            <legend className="text-xl font-bold">2. Quanto costa?</legend>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number" min={0} value={cost}
                onChange={(e) => setCost(Math.max(0, Number(e.target.value) || 0))}
                className="w-40 rounded-xl border-2 border-gray-400 px-4 py-3 text-2xl font-semibold"
                aria-label="Costo in euro"
              />
              <span className="text-2xl">€</span>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xl font-bold">3. Dove la fai?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {([
                ['diretta', 'Struttura convenzionata', 'Paga direttamente la compagnia. Tu paghi solo la tua parte.'],
                ['indiretta', 'Struttura NON convenzionata', 'Paghi tu tutta la fattura, poi chiedi il rimborso.'],
              ] as const).map(([r, title, desc]) => (
                <button
                  key={r}
                  onClick={() => setRegime(r)}
                  aria-pressed={regime === r}
                  className={`rounded-xl border-2 p-4 text-left ${regime === r ? 'border-acn bg-acn/10' : 'border-gray-300 hover:border-acn'}`}
                >
                  <span className="block text-lg font-semibold">{title}</span>
                  <span className="block text-base text-gray-700">{desc}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xl font-bold">4. Quando?</legend>
            <input
              type="date" value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-3 rounded-xl border-2 border-gray-400 px-4 py-3 text-lg"
            />
            <p className="mt-1 text-gray-600">La polizza è iniziata il {new Date(policy.startDate).toLocaleDateString('it-IT')}.</p>
          </fieldset>

          <details>
            <summary className="cursor-pointer text-lg text-acn-dark">Hai già avuto rimborsi quest'anno per questo tipo di spesa?</summary>
            <label className="mt-3 flex items-center gap-2 text-lg">
              Già rimborsati:
              <input
                type="number" min={0} value={used}
                onChange={(e) => setUsed(Math.max(0, Number(e.target.value) || 0))}
                className="w-36 rounded-xl border-2 border-gray-400 px-3 py-2 text-lg"
              />
              €
            </label>
          </details>
        </Card>

        <Card className="space-y-5" >
          <div aria-live="polite" className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-acn-dark">Risultato</p>
            {!result.covered && <p className="rounded-xl bg-amber-100 p-4 text-xl font-semibold text-amber-900">{result.reason}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-ink p-5 text-white">
                <p className="text-lg">Paghi tu</p>
                <p className="text-3xl font-bold xl:text-4xl">{eur(result.youPay)}</p>
              </div>
              <div className="rounded-xl bg-acn/10 p-5">
                <p className="text-lg">Paga la compagnia</p>
                <p className="text-3xl font-bold text-acn-dark xl:text-4xl">{eur(result.insurerPays)}</p>
              </div>
            </div>
            <div className="flex h-5 overflow-hidden rounded-full bg-acn/30" aria-hidden>
              <div className="bg-ink" style={{ width: `${youPct}%` }} />
            </div>
            <Speak text={`${result.covered ? '' : result.reason + ' '}${summary}`} />
          </div>

          <div>
            <p className="text-lg font-bold">Come si arriva a questo numero</p>
            <ol className="mt-3 space-y-3">
              {result.steps.map((s, i) => (
                <li key={i} className="rounded-xl border-2 border-gray-200 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold">{i + 1}. {s.label}</span>
                    <span className="text-gray-700">tu {eur(s.youPay)} · compagnia {eur(s.insurerPays)}</span>
                  </div>
                  <p className="mt-1 text-lg">{s.detail}</p>
                  {s.source && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-acn-dark">Dove lo dice la polizza ({s.source.article})</summary>
                      <div className="mt-2"><SourceQuote source={s.source} /></div>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <p className="text-sm text-gray-600">
            Calcolo fatto da un programma che applica le regole di “{cov.name}”, non dall'intelligenza artificiale. È una simulazione: l'importo finale lo stabilisce la compagnia.
          </p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext}>Hai altre domande? →</Button>
      </div>
    </div>
  );
}
