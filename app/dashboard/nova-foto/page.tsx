import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { NewPhotoScreen } from '@/components/new-photo-screen';
import { NotAnAuthor } from '@/components/not-an-author';
import { IconArrowLeft } from '@/components/icons';
import { painelDoAutor } from '@/lib/photographer-panel-data';
import { listCategories } from '@/lib/repository';
import { currentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Enviar foto',
  robots: { index: false, follow: false },
};

export default async function NovaFotoPage() {
  const session = await currentSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent('/dashboard/nova-foto')}`);
  }

  const [painel, categories] = await Promise.all([
    painelDoAutor(session.sub),
    listCategories(),
  ]);

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="tex-contact-sheet flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16">
          <Link
            href="/dashboard/minhas-fotos"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper"
          >
            <IconArrowLeft width={13} height={13} />
            Minhas fotos
          </Link>

          <h1 className="mt-5 font-serif text-[clamp(1.9rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            Enviar foto
          </h1>

          {painel ? (
            <>
              <p className="mt-3 max-w-[60ch] text-paper-300">
                Toda foto do acervo sai com a mesma licença — uso ilimitado,
                para sempre. O que muda de uma para a outra é o preço do
                arquivo, e ele é seu.
              </p>
              <NewPhotoScreen categories={categories} />
            </>
          ) : (
            <>
              <p className="mt-3 max-w-[56ch] text-paper-300">
                Esta conta ainda não publica no acervo.
              </p>
              <NotAnAuthor />
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
