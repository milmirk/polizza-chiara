import { useEffect, useState } from 'react';
import { api, type ExtractResponse } from './api';

export default function App() {
  const [health, setHealth] = useState<{ model: string; hasApiKey: boolean } | null>(null);
  const [data, setData] = useState<ExtractResponse | null>(null);

  useEffect(() => {
    api.health().then(setHealth);
    api.sample().then(setData);
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">
        Polizza Chiara<span className="text-acn">&gt;</span>
      </h1>
      <p className="mt-2 text-gray-600">
        Server: {health ? `${health.model} · API key ${health.hasApiKey ? 'ok' : 'assente (fallback)'}` : '…'}
      </p>
      <ul className="mt-6 space-y-2">
        {data?.policy.coverages.map((c) => (
          <li key={c.id} className="rounded-xl border p-4">
            <strong>{c.name}</strong>
            <p className="mt-1">{c.plain?.semplice}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
