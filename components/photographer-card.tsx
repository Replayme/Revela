import Image from 'next/image';
import Link from 'next/link';
import { FilmFrame } from './film-frame';
import { IconStar } from './icons';
import { formatCount, formatRating } from '@/lib/format';
import type { Photographer } from '@/lib/model';

/** Três colunas no desktop, uma no celular. */
const SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw';

/**
 * Fotógrafo em destaque: capa de um trabalho recente, retrato sobreposto e as
 * duas medidas que dizem se vale abrir o perfil — acervo publicado e nota.
 *
 * "Ver perfil" é o único link do card e cobre a moldura inteira pelo
 * pseudo-elemento esticado: uma parada de tabulação, card todo clicável, e o
 * mesmo destino não aparece duas vezes para quem navega por teclado.
 */
export function PhotographerCard({
  photographer,
}: {
  photographer: Photographer;
}) {
  return (
    <FilmFrame
      markings={false}
      className="group h-full transition hover:ring-1 hover:ring-amber/60"
    >
      <article className="flex h-full flex-col">
        <div className="relative aspect-[4/3] bg-prussia-900">
          <Image
            src={photographer.coverPhotoUrl}
            alt={`Trabalho recente de ${photographer.name}`}
            fill
            sizes={SIZES}
            className="object-cover"
          />

          {/* Retrato meio dentro da capa, meio no papel: costura as duas metades
              do card sem precisar de uma faixa divisória. */}
          <div className="absolute -bottom-8 left-4 size-16 overflow-hidden border-[3px] border-paper bg-prussia-800 sm:left-5">
            <Image
              src={photographer.avatarUrl}
              alt={`Retrato de ${photographer.name}`}
              width={64}
              height={64}
              className="size-full object-cover"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 pt-11 pb-4 sm:px-5">
          <h3 className="font-serif text-lg leading-tight font-medium tracking-[-0.01em] text-prussia-800">
            {photographer.name}
          </h3>

          <p className="mt-1.5 flex items-center gap-3 text-sm tabular-nums text-prussia-600">
            <span>{formatCount(photographer.photoCount)} fotos</span>
            <span aria-hidden className="h-3 w-px bg-prussia-800/20" />
            <span
              className="flex items-center gap-1.5"
              aria-label={`Avaliação ${formatRating(photographer.rating)} de 5`}
            >
              {formatRating(photographer.rating)}
              <IconStar width={13} height={13} />
            </span>
          </p>

          <p className="mt-auto pt-4">
            <Link
              href={`/perfil/${photographer.id}`}
              aria-label={`Ver o perfil de ${photographer.name}`}
              // Anel de foco no pseudo-elemento que cobre o card. O `!` em
              // outline-none é necessário: a regra de foco do globals.css está
              // fora de @layer e vence utilitários do Tailwind.
              className="text-sm font-medium text-prussia-800 underline decoration-prussia-800/25 decoration-2 underline-offset-4 transition-colors group-hover:decoration-amber after:absolute after:inset-0 focus-visible:outline-none! focus-visible:after:[outline:2px_solid_var(--color-amber)] focus-visible:after:[outline-offset:2px]"
            >
              Ver perfil
            </Link>
          </p>
        </div>
      </article>
    </FilmFrame>
  );
}

/** Mesma moldura e mesmas proporções do card, sem conteúdo. */
export function PhotographerCardSkeleton() {
  return (
    <FilmFrame markings={false} className="h-full">
      <div
        className="flex h-full flex-col animate-pulse motion-reduce:animate-none"
        aria-hidden
      >
        <div className="relative aspect-[4/3] bg-prussia-600/15">
          <div className="absolute -bottom-8 left-4 size-16 border-[3px] border-paper bg-prussia-600/20 sm:left-5" />
        </div>
        <div className="flex flex-1 flex-col px-4 pt-11 pb-4 sm:px-5">
          <div className="h-5 w-3/5 bg-prussia-600/15" />
          <div className="mt-3 h-3.5 w-2/5 bg-prussia-600/10" />
          <div className="mt-auto pt-4">
            <div className="h-4 w-20 bg-prussia-600/15" />
          </div>
        </div>
      </div>
    </FilmFrame>
  );
}
