import { CategoryCard, CategoryCardSkeleton } from './category-card';
import type { Category } from '@/lib/model';

const GRID = 'grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4';

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
