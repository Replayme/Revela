import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { RemovePhotoScreen } from '@/components/remove-photo-screen';
import { NotAnAuthor } from '@/components/not-an-author';
import { IconArrowLeft } from '@/components/icons';
import { fotoDoAutor, painelDoAutor } from '@/lib/mock-photographer-panel';
import { formatPrice } from '@/lib/format';
import { currentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tirar do acervo',
  robots: { index: false, follow: false }, // tela de conta
};

/**
 * Tirar uma foto do acervo — despublicar ou remover, na mesma tela.
 *
 * O porquê de as duas ficarem juntas está em `components/remove-photo-screen.tsx`:
 * o erro que esta tela existe para evitar é remover querendo despublicar, e
 * esse erro só se evita comparando as duas lado a lado.
 *
 * **A foto aparece.** Numa ação que não tem volta, ver a imagem é o que
 * denuncia estar na ficha errada antes do clique — o título sozinho não
 * denuncia, porque títulos parecidos são a regra num acervo de um autor só.
 *
 * Foto de outro autor responde 404, não 403, pelo mesmo motivo do recibo em
 * `/pedido/{id}`.
 */
export default async function RemoverFotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await currentSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/foto/${id}/remover`)}`);
  }

  const ehAutor = painelDoAutor(session.email) !== null;
  const photo = ehAutor ? fotoDoAutor(session.email, id) : undefined;
  if (ehAutor && !photo) notFound();

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="tex-contact-sheet flex-1">
        <div className="mx-auto w-full max-w-[840px] px-5 py-12 sm:px-8 sm:py-16">
          <Link
            href={photo ? `/dashboard/foto/${photo.id}` : '/dashboard/minhas-fotos'}
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper"
          >
            <IconArrowLeft width={13} height={13} />
            {photo ? 'Editar foto' : 'Minhas fotos'}
          </Link>

          <h1 className="mt-5 font-serif text-[clamp(1.9rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            Tirar do acervo
          </h1>

          {photo ? (
            <>
              <article className="mt-7 grid grid-cols-[88px_1fr] items-center gap-4 border border-paper/12 bg-prussia-950/50 p-3 sm:grid-cols-[132px_1fr] sm:gap-6 sm:p-4">
                <div className="relative aspect-[4/3] overflow-hidden bg-prussia-800">
                  <Image
                    src={photo.thumbnailUrl}
                    alt=""
                    fill
                    sizes="132px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-lg leading-snug font-medium text-paper">
                    {photo.title}
                  </h2>
                  <p className="mt-1.5 font-mono text-[11px] tracking-[0.12em] text-paper-500 uppercase">
                    {photo.category}
                    <span aria-hidden> · </span>
                    {formatPrice(photo.price)}
                    <span aria-hidden> · </span>
                    {photo.width}×{photo.height}
                  </p>
                </div>
              </article>

              <RemovePhotoScreen photo={photo} />
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
