import { Suspense } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ArchiveSearch } from '@/components/archive-search';

export const metadata = {
  title: 'O acervo — Revela',
  description:
    'Fotos de fotógrafos independentes, todas com a mesma licença: uso ilimitado, para sempre. Busque por assunto, autor ou categoria.',
};

/**
 * A busca do acervo — destino do "Explorar" em todo header do site.
 *
 * `Suspense` porque `ArchiveSearch` lê a query string com `useSearchParams`,
 * e o Next exige a fronteira para poder renderizar o resto da página antes de
 * saber os parâmetros.
 */
export default function ExplorarPage() {
  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={null}>
          <ArchiveSearch />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
