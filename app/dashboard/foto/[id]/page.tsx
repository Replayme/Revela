import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { EditPhotoScreen } from '@/components/edit-photo-screen';
import { NotAnAuthor } from '@/components/not-an-author';
import { IconArrowLeft } from '@/components/icons';
import { painelDoAutor } from '@/lib/mock-photographer-panel';
import { currentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Editar foto',
  robots: { index: false, follow: false }, // tela de conta
};

/**
 * Editar a ficha de uma foto do acervo.
 *
 * **A foto de outro autor responde 404, não 403.** É a mesma regra do recibo em
 * `/pedido/{id}`, e pelo mesmo motivo: "existe, mas não é sua" já conta quantas
 * fotos o acervo tem e quais ids são válidos. Quem não é dono não descobre nem
 * isso.
 *
 * A conferência de posse é feita **a partir da lista do autor**, e não buscando
 * a foto no catálogo para depois comparar o dono. Os dois caminhos dão o mesmo
 * resultado hoje; o segundo é o que um dia esquece a comparação.
 *
 * Salvar ainda não existe — falta `PATCH /api/fotos/{id}` — e a tela diz isso
 * na entrada. O porquê de dizer antes e não depois está em
 * `components/new-photo-screen.tsx`.
 */
export default async function EditarFotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await currentSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/foto/${id}`)}`);
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

          {painel ? <Edicao painel={painel} id={id} /> : <SemAutor />}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Edicao({
  painel,
  id,
}: {
  painel: NonNullable<ReturnType<typeof painelDoAutor>>;
  id: string;
}) {
  const photo = painel.photos.find((candidata) => candidata.id === id);
  if (!photo) notFound();

  return (
    <>
      <h1 className="mt-5 font-serif text-[clamp(1.9rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
        Editar foto
      </h1>
      <p className="mt-3 max-w-[60ch] text-paper-300">
        A ficha de{' '}
        <Link
          href={`/foto/${photo.id}`}
          className="font-medium text-paper underline decoration-paper/30 decoration-2 underline-offset-4 transition-colors hover:decoration-amber"
        >
          {photo.title}
        </Link>
        {/*
          A frase inteira troca de número, e não só o substantivo: com o artigo
          e o verbo fixos no plural, uma venda só produzia "não altera as
          licença já emitida, que valem".
        */}
        {photo.sales > 0 &&
          (photo.sales === 1
            ? ' — mudar o preço não altera a licença já emitida, que vale pelo que foi pago'
            : ` — mudar o preço não altera as ${photo.sales} licenças já emitidas, que valem pelo que foi pago`)}
        .
      </p>

      <EditPhotoScreen photo={photo} />
    </>
  );
}

function SemAutor() {
  return (
    <>
      <h1 className="mt-5 font-serif text-[clamp(1.9rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
        Editar foto
      </h1>
      <p className="mt-3 max-w-[56ch] text-paper-300">
        Esta conta ainda não publica no acervo.
      </p>
      <NotAnAuthor />
    </>
  );
}
