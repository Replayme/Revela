import { mockPhotos } from './mock-photos';

/**
 * As categorias do acervo, **derivadas das fotos**.
 *
 * Antes esta lista era escrita à mão e trazia outro vocabulário — Natureza,
 * Negócios, Viagens — que não batia com nenhuma categoria das fotos. O cartão
 * da home levava para uma busca que não tinha resultado nenhum. Derivar da
 * fonte é o que garante que todo filtro oferecido tem o que mostrar.
 *
 * Quando o acervo vier do back-end, esta lista vem com ele (um `GROUP BY`), e
 * a interface `Category` já é o formato esperado na resposta.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  photoCount: number;
  thumbnailUrl: string;
}

/** "Arquitetura e imóveis" → "arquitetura-e-imoveis". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const mockCategories: Category[] = (() => {
  const porNome = new Map<string, { count: number; seed: string }>();

  for (const photo of mockPhotos) {
    const atual = porNome.get(photo.category);
    if (atual) atual.count += 1;
    // A capa da categoria é a primeira foto dela: o cartão mostra o acervo
    // que promete, não uma imagem avulsa.
    else porNome.set(photo.category, { count: 1, seed: photo.id });
  }

  return [...porNome.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([name, { count, seed }], index) => ({
      id: `c-${String(index + 1).padStart(2, '0')}`,
      name,
      slug: slugify(name),
      photoCount: count,
      thumbnailUrl: `https://picsum.photos/seed/${seed}/600/600`,
    }));
})();

export function findCategory(slug: string): Category | undefined {
  return mockCategories.find((category) => category.slug === slug);
}
