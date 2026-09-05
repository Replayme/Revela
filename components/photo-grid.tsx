'use client';

import { PhotoCard, PhotoCardSkeleton } from './photo-card';
import { IconImage } from './icons';
import type { Photo } from '@/lib/model';

const GRIDS = {
  wide: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  compact: 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3',
} as const;

function frameNumber(index: number): string {
  return `${String(index + 1).padStart(2, '0')}A`;
}

export function PhotoGrid({
  photos,
  loading = false,
  skeletonCount = 8,
  onToggleFavorite,
  favorites,
  tone = 'paper',
  layout = 'wide',
}: {
  photos: Photo[];
  loading?: boolean;
  skeletonCount?: number;
  onToggleFavorite?: (id: string) => void;
  favorites?: ReadonlySet<string>;
  layout?: keyof typeof GRIDS;
  tone?: 'paper' | 'dark';
}) {
  const grid = GRIDS[layout];

  if (loading) {
    return (
      <div className={grid} role="status" aria-busy aria-label="Carregando fotos">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <PhotoCardSkeleton key={index} frameNumber={frameNumber(index)} />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return <EmptyState tone={tone} />;
  }

  return (
    <ul className={grid}>
      {photos.map((photo, index) => (
        <li
          key={photo.id}
          className="anim-reveal"
          style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
        >
          <PhotoCard
            photo={photo}
            frameNumber={frameNumber(index)}
            isFavorited={favorites?.has(photo.id) ?? false}
            onToggleFavorite={onToggleFavorite}
          />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ tone }: { tone: 'paper' | 'dark' }) {
  const escuro = tone === 'dark';
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-16 text-center ${
        escuro
          ? 'border-paper/20 text-paper-300'
          : 'border-prussia-800/25 text-prussia-600'
      }`}
    >
      <IconImage width={28} height={28} />
      <p
        className={`font-serif text-lg ${escuro ? 'text-paper' : 'text-prussia-800'}`}
      >
        Nenhuma foto encontrada
      </p>
      <p className="max-w-[40ch] text-sm">
        Ajuste os filtros ou tente outra palavra na busca.
      </p>
    </div>
  );
}
