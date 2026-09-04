import { Suspense } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ArchiveSearch } from '@/components/archive-search';
import { listCategories, listPhotos } from '@/lib/repository';

export const metadata = {
  title: 'O acervo',
  description:
    'Fotos de fotógrafos independentes, todas com a mesma licença: uso ilimitado, para sempre. Busque por assunto, autor ou categoria.',
};

/**
 * A busca do acervo — destino do "Explorar" em todo header do site.
 *
 * O acervo vem do servidor e desce por prop. Antes o `ArchiveSearch`
 * importava o array direto, o que empacotava o catálogo inteiro para o
 * navegador; a filtragem continua no cliente, que é o que dá o resultado
 * instantâneo ao arrastar o controle de preço.
 *
 * ⚠️ Ainda é o acervo **inteiro** de uma vez. Enquanto são catorze fotos, é
 * mais rápido assim; num acervo de verdade isto vira `GET /api/fotos`
 * paginado, e o filtro passa para o servidor. O estado já mora na query
 * string, então `?pagina=` entra sem mexer no resto.
 *
 * `Suspense` porque `ArchiveSearch` lê a query string com `useSearchParams`,
 * e o Next exige a fronteira para poder renderizar o resto da página antes de
 * saber os parâmetros.
 */
export default async function ExplorarPage() {
  const [photos, categories] = await Promise.all([listPhotos(), listCategories()]);

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <Suspense fallback={null}>
          <ArchiveSearch photos={photos} categories={categories} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
