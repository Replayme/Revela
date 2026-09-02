'use client';

import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { FilmFrame } from '@/components/film-frame';

/**
 * Home mínima — existe só para mostrar o header de duas faixas no peso cheio
 * e o bloco de categoria em formato de fotograma. Não faz parte da entrega
 * de login; substitua pela home real.
 */
export default function HomePage() {
  const categories = [
    { title: 'Ensaios de rua', count: '128 mil fotos', code: '01A' },
    { title: 'Retrato em estúdio', count: '94 mil fotos', code: '02A' },
    { title: 'Natureza e paisagem', count: '212 mil fotos', code: '03A' },
  ];

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader />

      <main className="tex-contact-sheet flex-1">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-6 lg:px-10">
          <h1 className="max-w-[16ch] font-serif text-[clamp(2.2rem,6vw,4rem)] leading-[1.02] font-medium tracking-[-0.02em] text-paper">
            O acervo de quem fotografa.
          </h1>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <FilmFrame
                key={category.code}
                frameNumber={category.code}
                edgeCode="REVELA 400"
              >
                <div className="px-4 py-6 sm:px-6">
                  <div className="mb-5 aspect-[5/3] bg-gradient-to-br from-prussia-500 to-prussia-950" />
                  <h2 className="font-serif text-xl leading-tight text-prussia-900">
                    {category.title}
                  </h2>
                  <p className="mt-1 text-xs tracking-[0.1em] text-prussia-600 uppercase">
                    {category.count}
                  </p>
                </div>
              </FilmFrame>
            ))}
          </div>

          <Link
            href="/login"
            className="mt-12 inline-block bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-colors hover:bg-amber-light"
          >
            Entrar na minha conta
          </Link>
        </div>
      </main>
    </div>
  );
}
