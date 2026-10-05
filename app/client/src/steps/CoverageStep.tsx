import { useState } from 'react';
import type { Coverage, Policy, RegimeTerms } from '../../../shared/types';
import type { CoverageCheck } from '../../../shared/verify';
import { api } from '../api';
import { Badge, Button, Card, SourceQuote, Speak, Spinner, eur } from '../ui';

type Lvl = 'semplice' | 'medio' | 'originale';

function termsText(t: RegimeTerms | null): string {
  if (!t) return 'Non prevista';
  const parts: string[] = [];
  if (t.deductible > 0) parts.push(`paghi tu una cifra fissa di ${eur(t.deductible)} (franchigia)`);
  if (t.copayPercent > 0) parts.push(`paghi tu il ${t.copayPercent}% della spesa${t.copayMin > 0 ? `, almeno ${eur(t.copayMin)}` : ''} (scoperto)`);
  return parts.length ? parts.join(' e ') : 'non paghi niente di tasca tua';
}

function Facts({ cov }: { cov: Coverage }) {
  if (!cov.covered) return null;
  return (
    <dl className="grid gap-3 text-lg sm:grid-cols-2">
      <div className="rounded-xl bg-gray-50 p-4">
        <dt className="font-semibold">In una struttura convenzionata</dt>
        <dd>{termsText(cov.diretta)}</dd>
      </div>
      <div className="rounded-xl bg-gray-50 p-4">
        <dt className="font-semibold">In una struttura non convenzionata</dt>
        <dd>{cov.indiretta ? `paghi tu la fattura, poi ti rimborsano; ${termsText(cov.indiretta)}` : 'Non prevista: nessun rimborso'}</dd>
      </div>
      <div className="rounded-xl bg-gray-50 p-4">
        <dt className="font-semibold">Massimo all'anno</dt>
        <dd>{cov.annualLimit !== null ? eur(cov.annualLimit) : 'Non indicato'}</dd>
      </div>
      <div className="rounded-xl bg-gray-50 p-4">
        <dt className="font-semibold">Quando parte</dt>
        <dd>{cov.waitingDays > 0 ? `dopo ${cov.waitingDays} giorni dall'inizio della polizza` : "subito dall'inizio della polizza"}</dd>
      </div>
    </dl>
  );
}

function Detail({ policy, cov, check }: { policy: Policy; cov: Coverage; check?: CoverageCheck }) {
  const [level, setLevel] = useState<Lvl>('semplice');
  const [alt, setAlt] = useState<{ text: string; meta: string; issues: string[] } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [cost, setCost] = useState(250);

  const verified = check && check.issues.length === 0;
  const baseText = level === 'originale' ? '' : cov.plain?.[level] ?? '';

  const ask = async (mode: 'riformula' | 'esempio') => {
    const lvl = level === 'originale' ? 'semplice' : level;
    setLoading(mode === 'esempio' ? 'Preparo un esempio…' : 'Lo riscrivo con parole diverse…');
    try {
      const r = await api.explain(policy, cov.id, lvl, mode, cost);
      const meta = r.fallback
        ? 'Testo preparato dal motore di calcolo (AI non disponibile)'
        : `Scritto dall'AI e controllato dal verificatore${r.attempts > 1 ? ` (corretto al ${r.attempts}° tentativo)` : ''}`;
      setAlt({ text: r.text, meta, issues: r.issues });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{cov.name}</h2>
        {cov.covered ? <Badge tone="ok">Coperta</Badge> : <Badge tone="warn">Non coperta</Badge>}
        {check && (verified ? <Badge tone="ok">✓ Verificata sul testo originale</Badge> : <Badge tone="warn">Da rivedere</Badge>)}
      </div>
      {cov.examples.length > 0 && <p className="text-gray-600">Per esempio: {cov.examples.join(', ')}</p>}

      <div role="tablist" aria-label="Livello di spiegazione" className="inline-flex rounded-xl border-2 border-acn p-1">
        {(['semplice', 'medio', 'originale'] as Lvl[]).map((l) => (
          <button
            key={l}
            role="tab"
            aria-selected={level === l}
            onClick={() => { setLevel(l); setAlt(null); }}
            className={`min-h-12 rounded-lg px-5 text-lg font-semibold ${level === l ? 'bg-acn text-white' : 'text-acn-dark'}`}
          >
            {l === 'originale' ? 'Testo originale' : l === 'medio' ? 'Medio' : 'Semplice'}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-acn-dark">
            {level === 'originale' ? 'Testo originale' : 'Spiegato semplice'}
          </p>
          {level === 'originale' ? (
            cov.source.map((s, i) => <SourceQuote key={i} source={s} />)
          ) : (
            <>
              <p className="text-xl leading-relaxed">{baseText}</p>
              <Speak text={baseText} />
            </>
          )}
        </div>
        {level !== 'originale' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Cosa dice la polizza, parola per parola</p>
            {cov.source.map((s, i) => <SourceQuote key={i} source={s} />)}
          </div>
        )}
      </div>

      <Facts cov={cov} />

      {check && check.issues.length > 0 && (
        <div className="rounded-xl border-2 border-amber-600 bg-amber-50 p-4">
          <p className="font-semibold">Il verificatore ha trovato qualcosa da controllare:</p>
          <ul className="list-disc pl-6">{check.issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      )}

      {cov.covered && (
        <div className="space-y-4 rounded-xl bg-acn/5 p-4">
          <p className="text-lg font-semibold">Non è chiaro?</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => ask('riformula')} disabled={!!loading}>Spiegamelo in un altro modo</Button>
            <Button variant="secondary" onClick={() => ask('esempio')} disabled={!!loading}>Fammi un esempio</Button>
            <label className="flex items-center gap-2 text-lg">
              con una fattura di
              <input
                type="number" min={1} value={cost}
                onChange={(e) => setCost(Math.max(1, Number(e.target.value) || 0))}
                className="w-28 rounded-lg border-2 border-gray-400 px-3 py-2 text-lg"
              />
              €
            </label>
          </div>
          {loading && <Spinner label={loading} />}
          {alt && !loading && (
            <div className="space-y-2" aria-live="polite">
              <p className="text-xl leading-relaxed">{alt.text}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Speak text={alt.text} />
                <span className="text-sm text-gray-600">{alt.meta}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function CoverageStep({ policy, checks, onNext }: { policy: Policy; checks: CoverageCheck[]; onNext: () => void }) {
  const [selected, setSelected] = useState(policy.coverages[0]?.id);
  const [term, setTerm] = useState<string | null>(null);
  const cov = policy.coverages.find((c) => c.id === selected);
  const g = policy.glossary.find((x) => x.term === term);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Garanzie" className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Cosa copre la tua polizza</p>
          {policy.coverages.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              aria-current={c.id === selected}
              className={`block w-full rounded-xl border-2 px-4 py-3 text-left text-lg ${c.id === selected ? 'border-acn bg-acn/10 font-semibold' : 'border-gray-200 hover:border-acn'}`}
            >
              <span className={c.covered ? '' : 'text-gray-500 line-through decoration-1'}>{c.name}</span>
            </button>
          ))}
        </nav>
        {cov && <Detail key={cov.id} policy={policy} cov={cov} check={checks.find((c) => c.coverageId === cov.id)} />}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-bold">Parole difficili</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {policy.glossary.map((x) => (
              <button
                key={x.term}
                onClick={() => setTerm(x.term === term ? null : x.term)}
                aria-pressed={x.term === term}
                className={`rounded-full border-2 px-4 py-2 text-lg ${x.term === term ? 'border-acn bg-acn text-white' : 'border-acn text-acn-dark hover:bg-acn/10'}`}
              >
                {x.term}
              </button>
            ))}
          </div>
          {g && (
            <div className="mt-4 space-y-3" aria-live="polite">
              <p className="text-xl">{g.definition}</p>
              <Speak text={`${g.term}: ${g.definition}`} />
              {g.source && <SourceQuote source={g.source} />}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="text-xl font-bold">Cosa NON è coperto</h3>
          <ul className="mt-3 space-y-3">
            {policy.exclusions.map((e) => (
              <li key={e.text}>
                <details>
                  <summary className="cursor-pointer text-lg">{e.plain ?? e.text}</summary>
                  <div className="mt-2"><SourceQuote source={e.source} /></div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext}>Vediamo quanto paghi →</Button>
      </div>
    </div>
  );
}
