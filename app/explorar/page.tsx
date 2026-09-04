import { Suspense } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ArchiveSearch } from '@/components/archive-search';

export const metadata = {
  title: 'O acervo',
  description:
    'Fotos de fotógrafos independentes, todas com a mesma licença: uso ilimitado, para sempre. Busque por assunto, autor ou categoria.',
};

export default function ExplorarPage() {
  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <Suspense fallback={null}>
          <ArchiveSearch />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
