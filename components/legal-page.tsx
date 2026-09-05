import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { IconAlert } from '@/components/icons';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

export function LegalPage({
  kicker,
  title,
  intro,
  sections,
  related,
}: {
  kicker: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  related: ReactNode;
}) {
  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="flex-1">
        <div className="mx-auto w-full max-w-[760px] px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
            {kicker}
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            {title}
          </h1>
          <div className="mt-4 max-w-[58ch] text-lg leading-relaxed text-paper-300">
            {intro}
          </div>

          <p className="mt-9 flex items-start gap-2.5 border border-dashed border-paper/25 px-4 py-3.5 text-sm text-paper-300">
            <IconAlert width={15} height={15} className="mt-0.5 shrink-0" />
            Redação de trabalho, ainda sem revisão jurídica. Antes de abrir o
            site é preciso passar por quem responde por isso.
          </p>

          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="mt-11 border-t-2 border-paper/15 pt-7"
            >
              <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
                <span className="mr-3 font-mono text-sm tabular-nums text-paper-500">
                  {section.id}
                </span>
                {section.title}
              </h2>
              <div className="mt-4 grid gap-4 text-paper-300">
                {section.body}
              </div>
            </section>
          ))}

          <p className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-paper/15 pt-7 text-sm">
            {related}
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-paper underline decoration-amber decoration-2 underline-offset-4"
    >
      {children}
    </Link>
  );
}
