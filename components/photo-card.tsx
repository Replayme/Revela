'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FilmFrame } from './film-frame';
import { IconHeart, IconHeartFilled, IconStar } from './icons';
import { formatPrice, formatRating } from '@/lib/format';
import type { Photo } from '@/lib/model';

/** Quatro colunas no desktop, uma no celular — o navegador escolhe o corte. */
const SIZES =
  '(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw';

/**
 * Foto do acervo dentro de um fotograma. O card inteiro é clicável pelo link
 * do título (pseudo-elemento esticado); favoritar e o nome do fotógrafo ficam
 * acima dele, então continuam sendo alvos próprios — três paradas de tabulação,
 * na ordem em que se lê o card.
 */
export function PhotoCard({
  photo,
  frameNumber,
  isFavorited = false,
  onToggleFavorite,
}: {
  photo: Photo;
  frameNumber?: string;
  /** Vem da lista de quem está logado, não do catálogo: favorito é de alguém. */
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  return (
    <FilmFrame
      frameNumber={frameNumber}
      className="h-full transition duration-200 hover:-translate-y-1 hover:ring-1 hover:ring-amber/60 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <article className="flex h-full flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-prussia-900">
          <Image
            src={photo.thumbnailUrl}
            alt={`${photo.title} — ${photo.category.toLowerCase()}, por ${photo.photographer.name}`}
            fill
            sizes={SIZES}
            className="object-cover"
          />
          <FavoriteButton
            photo={photo}
            isFavorited={isFavorited}
            onToggle={onToggleFavorite}
          />
        </div>

        <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
          {/*
            O anel de foco sai no pseudo-elemento que cobre o card inteiro, não
            em volta do título. O `!` em outline-none é necessário: a regra de
            foco do globals.css está fora de @layer e vence qualquer utilitário.
          */}
          <h3 className="font-serif text-lg leading-snug font-medium tracking-[-0.01em] text-prussia-900">
            <Link
              href={`/foto/${photo.id}`}
              className="after:absolute after:inset-0 focus-visible:outline-none! focus-visible:after:[outline:2px_solid_var(--color-amber)] focus-visible:after:[outline-offset:2px]"
            >
              {photo.title}
            </Link>
          </h3>

          <p className="mt-1.5 text-sm text-prussia-700/85">
            por{' '}
            <Link
              href={`/perfil/${photo.photographer.id}`}
              className="relative z-10 font-medium text-prussia-800 underline decoration-prussia-800/30 decoration-2 underline-offset-4 transition-colors hover:text-prussia-950 hover:decoration-amber"
            >
              {photo.photographer.name}
            </Link>
          </p>

          <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-prussia-800/12 pt-3.5">
            <span className="font-mono text-base font-semibold tabular-nums text-prussia-900">
              {formatPrice(photo.price)}
            </span>
            <span
              className="flex items-center gap-1.5 text-sm tabular-nums text-prussia-600"
              aria-label={`Avaliação ${formatRating(photo.rating)} de 5`}
            >
              {formatRating(photo.rating)}
              <IconStar width={13} height={13} />
            </span>
          </div>
        </div>
      </article>
    </FilmFrame>
  );
}

/**
 * Sem `onToggle` o botão não aparece.
 *
 * Ele já esteve na tela sem quem o atendesse — anunciando `aria-pressed` a
 * leitor de tela e não mudando nada ao clique. Um controle que mente sobre o
 * próprio estado é pior que controle nenhum, então quem não passa o
 * manipulador não ganha o botão.
 */
function FavoriteButton({
  photo,
  isFavorited,
  onToggle,
}: {
  photo: Photo;
  isFavorited: boolean;
  onToggle?: (id: string) => void;
}) {
  if (!onToggle) return null;

  const Icon = isFavorited ? IconHeartFilled : IconHeart;

  return (
    <button
      type="button"
      onClick={() => onToggle(photo.id)}
      aria-pressed={isFavorited}
      aria-label={
        isFavorited
          ? `Remover “${photo.title}” dos favoritos`
          : `Salvar “${photo.title}” nos favoritos`
      }
      className={`absolute top-2.5 right-2.5 z-10 border border-paper/20 bg-prussia-950/75 p-2 backdrop-blur-sm transition-colors hover:border-amber hover:text-amber ${
        isFavorited ? 'text-amber' : 'text-paper'
      }`}
    >
      <Icon width={17} height={17} />
    </button>
  );
}

/**
 * Mesma moldura e mesma proporção do card, sem conteúdo. Manter as duas
 * estruturas iguais é o que evita o salto de layout quando os dados chegam.
 */
export function PhotoCardSkeleton({ frameNumber }: { frameNumber?: string }) {
  return (
    <FilmFrame frameNumber={frameNumber} className="h-full">
      <div
        className="flex h-full flex-col animate-pulse motion-reduce:animate-none"
        aria-hidden
      >
        <div className="aspect-[4/3] bg-prussia-600/15" />
        <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
          <div className="h-5 w-4/5 bg-prussia-600/15" />
          <div className="mt-3 h-3.5 w-1/2 bg-prussia-600/10" />
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-prussia-800/12 pt-3.5">
            <div className="h-4 w-20 bg-prussia-600/15" />
            <div className="h-4 w-10 bg-prussia-600/10" />
          </div>
        </div>
      </div>
    </FilmFrame>
  );
}
