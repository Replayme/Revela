'use client';

import { PhotoCard, PhotoCardSkeleton } from './photo-card';
import { IconImage } from './icons';
import type { Photo } from '@/lib/mock-photos';

const GRID =
  'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

/** Marcação de borda do negativo: 01A, 02A, 03A… */
function frameNumber(index: number): string {
  return `${String(index + 1).padStart(2, '0')}A`;
}

export function PhotoGrid({
  photos,
  loading = false,
  skeletonCount = 8,
  onToggleFavorite,
}: {
  photos: Photo[];
  loading?: boolean;
  skeletonCount?: number;
  onToggleFavorite?: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className={GRID} role="status" aria-busy aria-label="Carregando fotos">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <PhotoCardSkeleton key={index} frameNumber={frameNumber(index)} />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className={GRID}>
      {photos.map((photo, index) => (
        <li
          key={photo.id}
          className="anim-reveal"
          // Escalonar a entrada até a oitava foto: passando disso o atraso
          // acumulado começa a parecer travamento, não revelação.
          style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
        >
          <PhotoCard
            photo={photo}
            frameNumber={frameNumber(index)}
            onToggleFavorite={onToggleFavorite}
          />
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-prussia-800/25 px-6 py-16 text-center text-prussia-600">
      <IconImage width={28} height={28} />
      <p className="font-serif text-lg text-prussia-800">
        Nenhuma foto encontrada
      </p>
      <p className="max-w-[40ch] text-sm">
        Ajuste os filtros ou tente outra palavra na busca.
      </p>
    </div>
  );
}
