import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { NewPhotoScreen } from '@/components/new-photo-screen';
import { NotAnAuthor } from '@/components/not-an-author';
import { IconArrowLeft } from '@/components/icons';
import { painelDoAutor } from '@/lib/mock-photographer-panel';
import { currentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Enviar foto',
  robots: { index: false, follow: false }, // tela de conta
};

/**
 * A tela de enviar uma foto para o acervo.
 *
 * **Ela ainda não publica**, e diz isso na entrada — o formulário confere tudo
 * e mostra a ficha que sairia, sem gravar nada. O porquê está em
 * `components/new-photo-screen.tsx`: sem lugar para guardar o arquivo, uma foto
 * dita publicada apareceria no acervo com a imagem de outra pessoa.
 *
 * A tela existe assim mesmo porque a conferência é a parte que dá para provar
 * hoje: tipo do arquivo, peso, medida mínima, título e preço. O que falta é o
 * último salto, e ele é de uma função só.
 *
 * Quem não é autor não vê o formulário: vê o caminho para o cadastro. Não é
 * permissão negada — é que não há para onde a foto ir sem uma assinatura.
 */
export default async function NovaFotoPage() {
  const session = await currentSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent('/dashboard/nova-foto')}`);
  }

  const painel = painelDoAutor(session.email);

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
              <NewPhotoScreen />
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
