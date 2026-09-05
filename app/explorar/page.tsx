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
