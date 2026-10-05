import { useEffect, useState } from 'react';
import { api, type ExtractResponse } from '../api';
import { Badge, Button, Card, Spinner } from '../ui';

const STAGES = ['Leggo il documento…', 'Trovo le garanzie e le regole…', 'Scrivo le spiegazioni semplici…', 'Controllo citazioni e numeri…'];

export function PolicyStep({ data, aiAvailable, onLoaded, onNext }: { data: ExtractResponse | null; aiAvailable: boolean; onLoaded: (d: ExtractResponse) => void; onNext: () => void }) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [loading]);

  const run = async (fn: () => Promise<ExtractResponse>) => {
    setLoading(true);
    try {
      onLoaded(await fn());
    } finally {
      setLoading(false);
    }
  };

  const checks = data?.checks ?? [];
  const okCount = checks.filter((c) => c.issues.length === 0).length;
  const pages = data?.sourceText?.match(/--- Pagina \d+ ---/g)?.length;
  const articles = data?.sourceText?.match(/### Art\. \d+/g)?.length;

  return (
    <div className="space-y-6">
      <Card className="border-acn/40 bg-acn/5">
        <p className="text-sm font-semibold uppercase tracking-widest text-acn-dark">Per chi è</p>
        <p className="mt-2 text-xl">
          <strong>Rosa, 66 anni</strong>, ha una polizza salute. Deve fare una <strong>risonanza magnetica</strong> e forse un{' '}
          <strong>day hospital</strong>. Vuole sapere: <em>è coperto? Quanto pago io?</em>
        </p>
      </Card>

      {!data && !loading && (
        <Card>
          <h2 className="text-2xl font-bold">Prendi la tua polizza</h2>
          <p className="mt-2 text-gray-700">Ti serve il documento “Condizioni di assicurazione”. Lo leggiamo insieme.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Button onClick={() => run(api.extractSample)}>Usa la polizza di Rosa</Button>
            <label className="inline-flex min-h-14 cursor-pointer items-center rounded-xl border-2 border-acn px-6 py-3 text-lg font-semibold text-acn-dark hover:bg-acn/10">
              Carica un PDF o un testo
              <input
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) run(() => api.extractFile(f));
                }}
              />
            </label>
          </div>
        </Card>
      )}

      {loading && (
        <Card>
          <Spinner label={STAGES[stage]} />
          <ol className="mt-4 space-y-1 text-gray-600">
            {STAGES.map((s, i) => (
              <li key={s} className={i <= stage ? 'text-ink' : ''}>
                {i < stage ? '✓' : i === stage ? '›' : '·'} {s}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {data && !loading && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Prima</p>
              <h2 className="mt-1 text-xl font-bold">Così è scritta la polizza</h2>
              <p className="text-gray-600">
                {pages ? `${pages} pagine` : 'Documento PDF'}
                {articles ? `, ${articles} articoli` : ''} di linguaggio tecnico.
              </p>
              {data.sourceText && (
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-100 p-3 font-serif text-xs leading-snug text-gray-700">
                  {data.sourceText}
                </pre>
              )}
            </Card>
            <Card>
              <p className="text-sm font-semibold uppercase tracking-widest text-acn-dark">Dopo</p>
              <h2 className="mt-1 text-xl font-bold">{data.policy.title}</h2>
              <p className="text-gray-600">{data.policy.insurer}</p>
              <ul className="mt-4 space-y-2 text-lg">
                <li><strong>{data.policy.coverages.length}</strong> garanzie spiegate in parole semplici</li>
                <li><strong>{data.policy.exclusions.length}</strong> esclusioni (cose non coperte)</li>
                <li><strong>{data.policy.glossary.length}</strong> parole difficili nel glossario</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={okCount === checks.length ? 'ok' : 'warn'}>
                  {okCount}/{checks.length} garanzie verificate sul testo originale
                </Badge>
                {data.fallback ? (
                  <Badge tone="info">Dati pre-estratti (modalità demo)</Badge>
                ) : data.cached ? (
                  <Badge tone="info">Estrazione già verificata · 0 token</Badge>
                ) : (
                  <Badge tone="info">Estratta dall'AI in {Math.round((data.ms ?? 0) / 1000)} s</Badge>
                )}
              </div>
              {data.error && <p className="mt-2 text-sm text-gray-500">L'AI non era disponibile: uso i dati già pronti.</p>}
              {data.cached && aiAvailable && (
                <Button variant="ghost" className="mt-2 px-0" onClick={() => run(() => api.extractSample(true))}>
                  Rifai l'estrazione con l'AI
                </Button>
              )}
            </Card>
          </div>
          <div className="flex justify-end">
            <Button onClick={onNext}>Iniziamo →</Button>
          </div>
        </>
      )}
    </div>
  );
}
