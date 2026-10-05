import { useEffect, useMemo, useState } from 'react';
import { LEVELS, type LibraryMeta } from '../../../shared/types';
import { api, type LoadedPolicy } from '../api';
import { Badge, Button, Card, Spinner } from '../ui';

const STAGES = ['Leggo il documento…', 'Trovo le garanzie e le regole…', 'Scrivo le spiegazioni semplici…', 'Controllo citazioni e numeri…'];
const PRODUCT_HINTS = ['Salute', 'Auto', 'Casa', 'Infortuni', 'Vita'];

function useStages(active: boolean) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!active) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [active]);
  return stage;
}

function UploadForm({ products, aiAvailable, onUploaded }: { products: string[]; aiAvailable: boolean; onUploaded: (p: LoadedPolicy) => void }) {
  const [product, setProduct] = useState('');
  const [level, setLevel] = useState('Base');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stage = useStages(busy);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onUploaded(await api.uploadPolicy(file, product, level, name));
      setFile(null);
      setName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input = 'min-h-14 w-full rounded-xl border-2 border-gray-400 px-4 text-lg';
  return (
    <Card>
      <h2 className="text-2xl font-bold">Carica una nuova polizza</h2>
      <p className="mt-1 text-gray-700">
        L'AI la legge una volta sola, la verifica e la aggiunge alla libreria per tutti.
      </p>
      <p className="mt-2 rounded-lg bg-amber-50 px-4 py-2 text-base text-amber-900">
        Carica solo condizioni generali di prodotto (set informativo), non documenti con dati personali dei clienti.
      </p>
      {!aiAvailable && <p className="mt-2 text-base text-gray-600">Il server non ha una chiave API: per ora si possono consultare solo le polizze già in libreria.</p>}
      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-lg">
          Prodotto
          <input required list="products" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="es. Salute" className={input} maxLength={80} />
          <datalist id="products">{[...new Set([...products, ...PRODUCT_HINTS])].map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <label className="grid gap-1 text-lg">
          Livello
          <input required list="levels" value={level} onChange={(e) => setLevel(e.target.value)} className={input} maxLength={80} />
          <datalist id="levels">{LEVELS.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        <label className="grid gap-1 text-lg">
          Nome (facoltativo)
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Se vuoto, uso il titolo del documento" className={input} maxLength={80} />
        </label>
        <label className="grid gap-1 text-lg">
          Documento (PDF o testo)
          <input
            required type="file" accept=".pdf,.txt,.md,application/pdf,text/plain"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="min-h-14 w-full rounded-xl border-2 border-dashed border-gray-400 px-4 py-3 text-base file:mr-4 file:rounded-lg file:border-0 file:bg-acn file:px-4 file:py-2 file:font-semibold file:text-white"
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 md:col-span-2">
          <Button type="submit" disabled={busy || !file || !aiAvailable}>Carica e analizza con l'AI</Button>
          {busy && <Spinner label={STAGES[stage]} />}
          {error && <p role="alert" className="text-lg text-red-800">{error}</p>}
        </div>
      </form>
    </Card>
  );
}

function Selected({ data, aiAvailable, onReplace, onDeleted, onNext }: { data: LoadedPolicy; aiAvailable: boolean; onReplace: (p: LoadedPolicy) => void; onDeleted: () => void; onNext: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stage = useStages(busy);
  const okCount = data.checks.filter((c) => c.issues.length === 0).length;
  const pages = data.sourceText?.match(/--- Pagina \d+ ---/g)?.length;
  const articles = data.sourceText?.match(/Art\. \d+/g) ? new Set(data.sourceText.match(/Art\. \d+/g)).size : undefined;

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Prima</p>
          <h2 className="mt-1 text-xl font-bold">Così è scritta la polizza</h2>
          <p className="text-gray-600">
            {pages ? `${pages} pagine` : 'Documento'}
            {articles ? `, ${articles} articoli` : ''} di linguaggio tecnico.
          </p>
          {data.sourceText && (
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-100 p-3 font-serif text-xs leading-snug text-gray-700">{data.sourceText}</pre>
          )}
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase tracking-widest text-acn-dark">Dopo</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{data.name}</h2>
            <Badge tone="info">{data.product} · {data.level}</Badge>
          </div>
          <p className="text-gray-600">{data.insurer}</p>
          <ul className="mt-4 space-y-2 text-lg">
            <li><strong>{data.policy.coverages.length}</strong> garanzie spiegate in parole semplici</li>
            <li><strong>{data.policy.exclusions.length}</strong> esclusioni (cose non coperte)</li>
            <li><strong>{data.policy.glossary.length}</strong> parole difficili nel glossario</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={okCount === data.checks.length ? 'ok' : 'warn'}>{okCount}/{data.checks.length} garanzie verificate sul testo originale</Badge>
            {data.ms !== undefined && (data.cached ? <Badge tone="info">Già analizzata: 0 token</Badge> : <Badge tone="info">Analizzata dall'AI in {Math.round(data.ms / 1000)} s</Badge>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {aiAvailable && data.sourceText && (
              <Button variant="ghost" className="px-0" disabled={busy} onClick={() => act(async () => onReplace(await api.reextract(data.id)))}>
                Rifai l'analisi con l'AI
              </Button>
            )}
            <Button
              variant="ghost" className="px-0 text-red-800" disabled={busy}
              onClick={() => window.confirm(`Eliminare "${data.name}" dalla libreria per tutti?`) && act(async () => { await api.deletePolicy(data.id); onDeleted(); })}
            >
              Elimina dalla libreria
            </Button>
          </div>
          {busy && <div className="mt-3"><Spinner label={STAGES[stage]} /></div>}
          {error && <p role="alert" className="mt-3 text-red-800">{error}</p>}
        </Card>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext}>Iniziamo →</Button>
      </div>
    </div>
  );
}

export function LibraryStep({ data, aiAvailable, onLoaded, onNext }: { data: LoadedPolicy | null; aiAvailable: boolean; onLoaded: (d: LoadedPolicy | null) => void; onNext: () => void }) {
  const [entries, setEntries] = useState<LibraryMeta[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => api.library().then(setEntries).catch((e) => setError((e as Error).message));
  useEffect(() => { refresh(); }, []);

  const groups = useMemo(() => {
    const m = new Map<string, LibraryMeta[]>();
    entries?.forEach((e) => m.set(e.product, [...(m.get(e.product) ?? []), e]));
    return [...m.entries()];
  }, [entries]);

  const open = async (id: string) => {
    setOpening(id);
    setError(null);
    try {
      onLoaded(await api.openPolicy(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold">Libreria delle polizze</h2>
        <p className="mt-1 text-gray-700">Scegli il prodotto e il livello di copertura. Ogni polizza è già stata letta e verificata: aprirla non costa nulla.</p>
        {!entries && !error && <div className="mt-4"><Spinner label="Carico la libreria…" /></div>}
        {error && <p role="alert" className="mt-4 text-red-800">{error}</p>}
        {entries?.length === 0 && <p className="mt-4 text-lg">La libreria è vuota: carica la prima polizza qui sotto.</p>}
        <div className="mt-6 space-y-6">
          {groups.map(([product, list]) => (
            <section key={product} aria-label={product}>
              <h3 className="text-xl font-bold">{product}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => open(e.id)}
                    aria-pressed={data?.id === e.id}
                    disabled={opening !== null}
                    className={`rounded-xl border-2 p-4 text-left ${data?.id === e.id ? 'border-acn bg-acn/10' : 'border-gray-200 hover:border-acn'}`}
                  >
                    <span className="inline-block rounded-full bg-acn px-3 py-0.5 text-sm font-bold text-white">{e.level}</span>
                    <span className="mt-2 block text-lg font-semibold">{e.name}</span>
                    <span className="block text-base text-gray-600">{e.insurer}</span>
                    <span className="mt-1 block text-sm text-gray-600">{e.coverages} garanzie · {e.verified} verificate</span>
                    {opening === e.id && <span className="mt-2 block"><Spinner label="Apro…" /></span>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Card>

      {data && (
        <Selected
          key={data.id}
          data={data}
          aiAvailable={aiAvailable}
          onReplace={(p) => { onLoaded(p); refresh(); }}
          onDeleted={() => { onLoaded(null); refresh(); }}
          onNext={onNext}
        />
      )}

      <UploadForm
        products={[...new Set(entries?.map((e) => e.product) ?? [])]}
        aiAvailable={aiAvailable}
        onUploaded={(p) => { onLoaded(p); refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />
    </div>
  );
}
