import type { ReactNode } from 'react';

export function Seite({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-4 pt-4 pb-28">
      <h1 className="mb-4 text-2xl font-bold">{titel}</h1>
      {children}
    </main>
  );
}

export function Karte({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${className}`}>
      {children}
    </div>
  );
}
