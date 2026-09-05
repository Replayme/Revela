'use client';

import type { ReactNode } from 'react';
import { SiteHeader } from './site-header';
import { useLocale } from './locale-provider';
import { IconLock } from './icons';

export function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="tex-contact-sheet flex-1">
        <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_minmax(0,540px)] lg:gap-20 lg:px-10 lg:py-16">
          <EditorialAside />
          <div className="order-1 w-full lg:order-2">{children}</div>
        </div>
      </main>

      <footer className="border-t border-paper/12 bg-prussia-950/60">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-4 py-4 text-[11px] text-paper-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <span className="inline-flex items-center gap-1.5">
            <IconLock width={12} height={12} />
            {t('login.secure')}
          </span>
          <span>© {new Date().getFullYear()} Revela</span>
        </div>
      </footer>
    </div>
  );
}

function EditorialAside() {
  const { t } = useLocale();
  const stats = {
    license: '1',
    term: '∞',
    payout: '0%',
  };

  return (
    <aside className="order-2 lg:order-1">
      <p className="font-mono text-[10px] tracking-[0.24em] text-amber uppercase">
        {t('aside.eyebrow')}
      </p>

      <h1 className="mt-4 max-w-[13ch] font-serif text-[clamp(2rem,5.2vw,3.5rem)] leading-[1.03] font-medium tracking-[-0.02em] text-paper">
        {t('aside.headline')}
      </h1>

      <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-paper-300">
        {t('aside.body')}
      </p>

      <ContactSheet />

      <dl className="mt-8 grid max-w-lg grid-cols-1 gap-px border border-paper/12 bg-paper/12 sm:grid-cols-3">
        <Stat value={stats.license} label={t('aside.stat1')} />
        <Stat value={stats.term} label={t('aside.stat2')} />
        <Stat value={stats.payout} label={t('aside.stat3')} />
      </dl>
    </aside>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 bg-prussia-900 px-3 py-3.5">
      <dt className="font-serif text-xl leading-none text-paper">{value}</dt>
      <dd className="mt-1.5 text-[10px] leading-snug tracking-[0.1em] text-paper-500 uppercase">
        {label}
      </dd>
    </div>
  );
}

function ContactSheet() {
  const tiles = [
    'from-prussia-600 to-prussia-950',
    'from-prussia-500 to-prussia-900',
    'from-prussia-700 to-prussia-950',
    'from-prussia-400 to-prussia-800',
  ];

  return (
    <div aria-hidden className="mt-8 hidden max-w-lg grid-cols-4 gap-2 sm:grid">
      {tiles.map((tile, index) => (
        <figure key={tile} className="border border-paper/15 p-1">
          <div className={`aspect-[4/5] bg-gradient-to-br ${tile}`} />
          <figcaption className="pt-1 font-mono text-[8px] tracking-[0.16em] text-paper-500">
            {String(index + 1).padStart(2, '0')}A
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
