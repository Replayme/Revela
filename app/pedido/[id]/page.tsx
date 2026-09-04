import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { IconAlert, IconCheck, IconDownload } from '@/components/icons';
import { findOrderById } from '@/lib/repository';
import { findPhoto } from '@/lib/mock-photos';
import { UNIVERSAL_LICENSE, licenseByVersion } from '@/lib/license';
import { currentSession } from '@/lib/session';
import { formatDateLong, formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Recibo e licença',
  robots: { index: false, follow: false }, // recibo é de quem comprou
};

/**
 * O recibo de um pedido: quem comprou, o que comprou, quanto pagou e sob qual
 * licença — mais o arquivo.
 *
 * Esta página é a prova da compra. É o que a pessoa manda para a agência que
 * vai usar a foto, e é onde ela confere que a licença cobre o uso pretendido.
 * Por isso ela repete o texto da licença em vez de só apontar para
 * `/licenca`: a página de licença mostra a versão de hoje, e o recibo precisa
 * mostrar a versão que foi aceita.
 *
 * Pedido de outra pessoa dá 404 — a busca já filtra pelo dono (`findOrderById`).
 */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await currentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/pedido/${id}`)}`);

  const order = await findOrderById(session.sub, id);
  if (!order) notFound();

  const photo = findPhoto(order.photoId);
  // Versão desconhecida só acontece se o texto sumir do código sem migração.
  // Cai na atual com aviso, em vez de derrubar o recibo de uma compra real.
  const license = licenseByVersion(order.licenseVersion);
  const shown = license ?? UNIVERSAL_LICENSE;

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="flex-1">
        <div className="mx-auto w-full max-w-[860px] px-5 py-10 sm:px-8 sm:py-14">
          <nav aria-label="Trilha" className="text-xs text-paper-500">
            <Link href="/dashboard" className="hover:text-paper">
              Minha conta
            </Link>
            <span aria-hidden> · </span>
            <span>Recibo</span>
          </nav>

          <p className="mt-7 flex items-center gap-2 font-mono text-[10px] tracking-[0.24em] text-signal-ok uppercase">
            <IconCheck width={13} height={13} />
            Licença emitida
          </p>
          <h1 className="mt-3 font-serif text-[clamp(1.9rem,5vw,2.75rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            {photo?.title ?? 'Foto fora do acervo'}
          </h1>
          {photo && (
            <p className="mt-3 text-paper-300">
              por{' '}
              <Link
                href={`/perfil/${photo.photographer.id}`}
                className="font-medium text-paper underline decoration-amber decoration-2 underline-offset-4"
              >
                {photo.photographer.name}
              </Link>
            </p>
          )}

          <div className="mt-9 grid gap-8 sm:grid-cols-[minmax(0,240px)_1fr] sm:gap-10">
            <div>
              {photo && (
                <div className="relative aspect-[4/3] overflow-hidden bg-prussia-800">
                  <Image
                    src={photo.thumbnailUrl}
                    alt={`${photo.title}, por ${photo.photographer.name}`}
                    fill
                    sizes="240px"
                    className="object-cover"
                  />
                </div>
              )}
              <a
                href={`/api/pedidos/${order.id}/arquivo`}
                className="mt-4 flex w-full items-center justify-center gap-2.5 bg-amber px-5 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
              >
                <IconDownload width={15} height={15} />
                Baixar arquivo
              </a>
              <p className="mt-3 text-xs leading-relaxed text-paper-500">
                O download confere a licença a cada pedido. Demonstração: o
                arquivo é a imagem do acervo de exemplo em resolução maior.
              </p>
            </div>

            {/* Os dados do pedido. `dl` porque é exatamente isto: rótulo e
                valor — e é o que um leitor de tela precisa ouvir em pares. */}
            <dl className="grid gap-px border border-paper/12 bg-paper/12 text-sm">
              <Row label="Pedido">
                <span className="font-mono tabular-nums">{order.id}</span>
              </Row>
              <Row label="Data">{formatDateLong(order.createdAt)}</Row>
              <Row label="Licenciado para">
                {session.name}
                <span className="block text-paper-500">{session.email}</span>
              </Row>
              <Row label="Valor pago">
                <span className="font-mono tabular-nums">
                  {formatPrice(order.pricePaid)}
                </span>
              </Row>
              <Row label="Licença">
                {shown.name} v{order.licenseVersion}
                <span className="block text-paper-500">
                  Perpétua, sem limite de uso ou de tiragem.
                </span>
              </Row>
            </dl>
          </div>

          {!license && (
            <p
              role="alert"
              className="mt-8 flex items-start gap-2.5 border-l-2 border-signal-error bg-signal-error/10 px-4 py-3 text-sm text-paper-300"
            >
              <IconAlert width={15} height={15} className="mt-0.5 shrink-0 text-signal-error" />
              <span>
                O texto da versão {order.licenseVersion} não foi encontrado.
                Abaixo está a versão {UNIVERSAL_LICENSE.version}, que pode
                diferir do que foi aceito nesta compra.
              </span>
            </p>
          )}

          <section className="mt-14 border-t-2 border-paper/15 pt-8">
            <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
              A licença desta compra
            </h2>
            <p className="mt-3 max-w-[58ch] text-paper-300">{shown.summary}</p>

            <div className="mt-8 grid gap-9 sm:grid-cols-2 sm:gap-10">
              <div>
                <h3 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
                  O que você pode fazer
                </h3>
                <ul className="mt-4 grid gap-3">
                  {shown.permissions.map((item) => (
                    <li key={item} className="grid grid-cols-[16px_1fr] gap-2.5">
                      <IconCheck width={14} height={14} className="mt-1 text-signal-ok" />
                      <span className="text-sm leading-relaxed text-paper-300">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
                  O que a licença não cobre
                </h3>
                <ul className="mt-4 grid gap-3">
                  {shown.restrictions.map((item) => (
                    <li key={item} className="grid grid-cols-[16px_1fr] gap-2.5">
                      <IconAlert width={14} height={14} className="mt-1 text-signal-error" />
                      <span className="text-sm leading-relaxed text-paper-300">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-9 text-sm text-paper-500">
              Texto integral em{' '}
              <Link
                href="/licenca"
                className="text-paper-300 underline decoration-amber decoration-2 underline-offset-4 hover:text-paper"
              >
                /licenca
              </Link>
              . Redação de trabalho, ainda sem revisão jurídica.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 bg-prussia-950/60 px-4 py-3.5 sm:grid-cols-[13ch_1fr] sm:gap-4">
      <dt className="font-mono text-[10px] tracking-[0.18em] text-paper-500 uppercase sm:pt-0.5">
        {label}
      </dt>
      <dd className="text-paper">{children}</dd>
    </div>
  );
}
