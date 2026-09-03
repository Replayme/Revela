/**
 * Categorias do acervo. Fixas por enquanto — quando vierem do back-end, a
 * interface `Category` já é o formato esperado na resposta.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  photoCount: number;
  thumbnailUrl: string;
}

/** Imagem determinística por slug — o mesmo slug devolve sempre a mesma foto. */
function thumbnailFor(slug: string): string {
  return `https://picsum.photos/seed/${slug}/600/600`;
}

const CATALOG: Omit<Category, 'thumbnailUrl'>[] = [
  { id: 'c-01', name: 'Natureza', slug: 'natureza', photoCount: 2480 },
  { id: 'c-02', name: 'Negócios', slug: 'negocios', photoCount: 1240 },
  { id: 'c-03', name: 'Viagens', slug: 'viagens', photoCount: 1875 },
  { id: 'c-04', name: 'Pessoas', slug: 'pessoas', photoCount: 2113 },
  { id: 'c-05', name: 'Tecnologia', slug: 'tecnologia', photoCount: 964 },
  { id: 'c-06', name: 'Alimentos', slug: 'alimentos', photoCount: 1432 },
  { id: 'c-07', name: 'Esportes', slug: 'esportes', photoCount: 387 },
  { id: 'c-08', name: 'Arquitetura', slug: 'arquitetura', photoCount: 1698 },
];

export const mockCategories: Category[] = CATALOG.map((category) => ({
  ...category,
  thumbnailUrl: thumbnailFor(category.slug),
}));
