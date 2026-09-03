import Image from 'next/image';
import Link from 'next/link';
import { FilmFrame } from './film-frame';
import { formatCount } from '@/lib/format';
import type { Category } from '@/lib/mock-categories';

/** Quatro colunas no desktop, duas no celular. */
const SIZES =
  '(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 45vw';

/**
 * Categoria do acervo num fotograma sem marcação de borda: o selo
 * "REVELA 400 ▸ 12A" identifica a foto no `PhotoCard`, e repeti-lo aqui
 * esvaziaria o sinal. Card inteiro clicável, uma parada de tabulação.
 */
export function CategoryCard({ category }: { category: Category }) {
  return (
    <FilmFrame
      markings={false}
      className="h-full transition hover:ring-1 hover:ring-amber/60"
    >
      {/*
        O link fica estático (sem `relative`) de propósito: assim o
        pseudo-elemento esticado se resolve contra a moldura, cobrindo o card
        inteiro — área clicável e anel de foco. O `!` em outline-none é
        necessário porque a regra de foco do globals.css está fora de @layer.
      */}
      <Link
        href={`/explorar?categoria=${category.slug}`}
        className="block after:absolute after:inset-0 focus-visible:outline-none! focus-visible:after:[outline:2px_solid_var(--color-amber)] focus-visible:after:[outline-offset:2px]"
      >
        <div className="relative aspect-square overflow-hidden bg-prussia-900">
          <Image
            src={category.thumbnailUrl}
            alt={`Foto representando a categoria ${category.name}`}
            fill
            sizes={SIZES}
            className="object-cover"
          />

          {/*
            Véu leve na foto inteira e degradê só no rodapé, onde o texto se
            apoia. Um véu chapado forte o bastante para garantir contraste
            apagaria a foto; o degradê concentra o escuro onde ele é preciso.
            No pior caso — foto estourada de branco — o texto em papel sai em
            5,7:1 sobre o degradê, acima do mínimo AA.
          */}
          <div aria-hidden className="absolute inset-0 bg-prussia-950/25" />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-prussia-950 via-prussia-950/70 to-transparent"
          />

          <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
            <h3 className="font-serif text-lg leading-tight font-medium tracking-[-0.01em] text-paper">
              {category.name}
            </h3>
            <p className="mt-0.5 text-xs tabular-nums text-paper/70">
              {formatCount(category.photoCount)} fotos
            </p>
          </div>
        </div>
      </Link>
    </FilmFrame>
  );
}

/** Mesma moldura e mesma proporção do card, sem conteúdo. */
export function CategoryCardSkeleton() {
  return (
    <FilmFrame markings={false} className="h-full">
      <div className="animate-pulse motion-reduce:animate-none" aria-hidden>
        <div className="relative aspect-square bg-prussia-600/15">
          <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
            <div className="h-4 w-3/5 bg-prussia-600/20" />
            <div className="mt-2 h-3 w-2/5 bg-prussia-600/15" />
          </div>
        </div>
      </div>
    </FilmFrame>
  );
}
