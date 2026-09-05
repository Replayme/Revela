import {
  PhotographerCard,
  PhotographerCardSkeleton,
} from './photographer-card';
import type { Photographer } from '@/lib/model';

const GRID = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

export function PhotographerGrid({
  photographers,
  loading = false,
  skeletonCount = 6,
}: {
  photographers: Photographer[];
  loading?: boolean;
  skeletonCount?: number;
}) {
  return (
    <div>
      <h2 className="font-serif text-[2rem] leading-tight font-normal tracking-[-0.01em] text-prussia-900">
        Fotógrafos em destaque
      </h2>
      <p className="mt-2 mb-8 max-w-[56ch] text-prussia-600">
        Vendem direto por aqui, sem comissão sobre o cachê.
      </p>

      {loading ? (
        <div
          className={GRID}
          role="status"
          aria-busy
          aria-label="Carregando fotógrafos"
        >
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <PhotographerCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <ul className={GRID}>
          {photographers.map((photographer, index) => (
            <li
              key={photographer.id}
              className="anim-reveal"
              style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
            >
              <PhotographerCard photographer={photographer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
