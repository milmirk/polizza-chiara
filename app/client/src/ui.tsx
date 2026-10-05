import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { SourceRef } from '../../shared/types';

export const eur = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0, useGrouping: 'always' } as Intl.NumberFormatOptions);

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-acn text-white hover:bg-acn-dark disabled:bg-gray-400',
    secondary: 'border-2 border-acn text-acn-dark bg-white hover:bg-acn/10 disabled:opacity-50',
    ghost: 'text-acn-dark underline underline-offset-4 hover:text-acn',
  };
  return (
    <button
      className={`min-h-14 rounded-xl px-6 py-3 text-lg font-semibold transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border-2 border-gray-200 bg-white p-6 ${className}`}>{children}</div>;
}

export function Badge({ tone, children }: { tone: 'ok' | 'warn' | 'info'; children: ReactNode }) {
  const styles = {
    ok: 'bg-green-100 text-green-900 border-green-700',
    warn: 'bg-amber-100 text-amber-900 border-amber-700',
    info: 'bg-acn/10 text-acn-dark border-acn',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${styles[tone]}`}>{children}</span>;
}

export function SourceQuote({ source }: { source: SourceRef }) {
  return (
    <figure className="rounded-xl border-l-4 border-gray-500 bg-gray-50 px-4 py-3">
      <blockquote className="font-serif text-base text-gray-800">“{source.quote}”</blockquote>
      <figcaption className="mt-1 text-sm text-gray-600">
        {source.article}
        {source.page ? ` · pagina ${source.page}` : ''}
      </figcaption>
    </figure>
  );
}

export function Speak({ text }: { text: string }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const speak = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };
  return (
    <button onClick={speak} className="rounded-lg border-2 border-acn-dark px-3 py-1 text-base font-semibold text-acn-dark hover:bg-acn/10" aria-label="Ascolta il testo">
      ▶ Ascolta
    </button>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-lg text-gray-700">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-acn border-t-transparent" />
      {label}
    </div>
  );
}
