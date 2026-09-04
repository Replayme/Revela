import type { MetadataRoute } from 'next';
import { listCategories, listPhotographers, listPhotos } from '@/lib/repository';
import { siteUrl } from '@/lib/site';

/**
 * O mapa do site para os buscadores.
 *
 * Gerado das mesmas fontes que as páginas usam, e não de uma lista à mão: uma
 * lista paralela envelhece calada — some uma foto do acervo e o sitemap segue
 * anunciando a URL por meses.
 *
 * As telas de conta não entram (já são `noindex` por página, e o `robots.ts`
 * também as bloqueia). Quando o acervo vier do banco, isto vira uma consulta;
 * acima de 50 mil URLs o Next quer o sitemap dividido em vários.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // As três em paralelo: o mapa do site é uma página só, e enfileirar somaria
  // três idas ao banco na geração dele.
  const [photos, categories, photographers] = await Promise.all([
    listPhotos(),
    listCategories(),
    listPhotographers(),
  ]);

  const url = (caminho: string) => `${siteUrl()}${caminho}`;

  return [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/explorar'), changeFrequency: 'daily', priority: 0.9 },
    { url: url('/licenca'), changeFrequency: 'yearly', priority: 0.5 },
    { url: url('/cadastro-fotografo'), changeFrequency: 'yearly', priority: 0.6 },
    { url: url('/termos'), changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/privacidade'), changeFrequency: 'yearly', priority: 0.2 },

    ...categories.map((categoria) => ({
      url: url(`/explorar?categoria=${categoria.slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),

    ...photographers.map((photographer) => ({
      url: url(`/perfil/${photographer.id}`),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),

    ...photos.map((photo) => ({
      url: url(`/foto/${photo.id}`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
