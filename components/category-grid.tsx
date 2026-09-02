import { CategoryCard, CategoryCardSkeleton } from './category-card';
import type { Category } from '@/lib/mock-categories';

// Mesmo gap do PhotoGrid: as duas seções precisam bater o ritmo na home.
const GRID = 'grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4';

/**
 * As categorias são fixas, então não há estado vazio: se a lista chegar
 * vazia é falha de dados, e uma grade sem nada diz isso melhor do que uma
 * mensagem de "nenhum resultado" que sugere busca.
 */
export function CategoryGrid({
  categories,
  loading = false,
  skeletonCount = 8,
}: {
  categories: Category[];
  loading?: boolean;
  skeletonCount?: number;
}) {
  return (
    <div>
      {/* Casa com o `.titulo` das outras seções da home (Fraunces, 2rem). */}
      <h2 className="mb-8 font-serif text-[2rem] leading-tight font-normal tracking-[-0.01em] text-prussia-900">
        Explore por categoria
      </h2>

      {loading ? (
        <div
          className={GRID}
          role="status"
          aria-busy
          aria-label="Carregando categorias"
        >
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <CategoryCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <ul className={GRID}>
          {categories.map((category, index) => (
            <li
              key={category.id}
              className="anim-reveal"
              style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
            >
              <CategoryCard category={category} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
