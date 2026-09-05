import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { NotAnAuthor } from '@/components/not-an-author';
import { IconArrowLeft, IconAlert, IconLicense } from '@/components/icons';
import { painelDoAutor, vendasDoAutor } from '@/lib/photographer-panel-data';
import { UNIVERSAL_LICENSE } from '@/lib/license';
import { formatCount, formatDate, formatPrice } from '@/lib/format';
import { currentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Vendas',
  robots: { index: false, follow: false },
};

export default async function VendasPage() {
  const session = await currentSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent('/dashboard/vendas')}`);
  }

  const painel = await painelDoAutor(session.sub);
  const ehAutor = painel !== null;
  const vendas = await vendasDoAutor(painel);
  const total = vendas.reduce((soma, venda) => soma + venda.order.pricePaid, 0);

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

          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <h1 className="font-serif text-[clamp(1.9rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
              Vendas
            </h1>
            {vendas.length > 0 && (
              <p className="font-mono text-xs tracking-[0.16em] text-paper-500 uppercase">
                {formatCount(vendas.length)}{' '}
                {vendas.length === 1 ? 'licença' : 'licenças'}
                <span aria-hidden> · </span>
                {formatPrice(total)}
              </p>
            )}
          </div>

          {!ehAutor ? (
            <>
              <p className="mt-3 max-w-[56ch] text-paper-300">
                Esta conta ainda não publica no acervo.
              </p>
              <NotAnAuthor />
            </>
          ) : vendas.length === 0 ? (
            <SemVendas />
          ) : (
            <>
              <RepasseAindaNao />

              <ul className="mt-9 grid gap-4">
                {vendas.map(({ order, photo }) => (
                  <li key={order.id}>
                    <article className="grid grid-cols-[88px_1fr] gap-4 border border-paper/12 bg-prussia-950/50 p-3 sm:grid-cols-[132px_1fr] sm:gap-6 sm:p-4">
                      <div className="relative aspect-[4/3] overflow-hidden bg-prussia-800">
                        <Image
                          src={photo.thumbnailUrl}
                          alt=""
                          fill
                          sizes="132px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                          <h2 className="font-serif text-lg leading-snug font-medium text-paper">
                            <Link
                              href={`/foto/${photo.id}`}
                              className="transition-colors hover:text-amber"
                            >
                              {photo.title}
                            </Link>
                          </h2>
                          <span className="font-mono text-base font-semibold tabular-nums text-paper">
                            {formatPrice(order.pricePaid)}
                          </span>
                        </div>

                        <p className="mt-1.5 font-mono text-[11px] tracking-[0.12em] text-paper-500 uppercase">
                          {formatDate(order.createdAt)}
                          <span aria-hidden> · </span>
                          {photo.category}
                        </p>

                        <p className="mt-auto flex items-center gap-2 pt-3 text-[11px] tracking-[0.12em] text-paper-400 uppercase">
                          <IconLicense width={13} height={13} />
                          {UNIVERSAL_LICENSE.name} v{order.licenseVersion}
                        </p>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>

              <QuemComprou />
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function RepasseAindaNao() {
  return (
    <div className="mt-8 flex items-start gap-3 border-l-[3px] border-amber bg-amber/8 px-4 py-3.5">
      <IconAlert width={17} height={17} className="mt-0.5 shrink-0 text-amber" />
      <div className="min-w-0 text-sm leading-relaxed text-paper-300">
        <p className="font-semibold text-paper">Nada foi repassado ainda.</p>
        <p className="mt-1.5">
          O site não cobra: o pedido é gravado direto, sem provedor de
          pagamento. Os valores abaixo são o preço das licenças emitidas — não
          dinheiro que entrou em conta. O caminho do pagamento está descrito no{' '}
          <code className="font-mono text-paper-400">docs/API.md</code> §11:
          pedido pendente, provedor, webhook de confirmação, e só então o
          download liberado.
        </p>
      </div>
    </div>
  );
}

function QuemComprou() {
  return (
    <section className="mt-14 border-t border-paper/12 pt-7">
      <h2 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
        Quem comprou não aparece
      </h2>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-paper-300">
        O pedido guarda quem licenciou, e trazer esse nome para cá seria uma
        linha de código. Mas ninguém decidiu que o autor pode saber a identidade
        de quem compra, e a licença funciona sem isso. Enquanto não houver essa
        decisão escrita, a lista mostra o que foi vendido e não quem levou.
      </p>
    </section>
  );
}

function SemVendas() {
  return (
    <div className="mt-9 border border-dashed border-paper/20 px-6 py-14 text-center">
      <IconLicense width={26} height={26} className="mx-auto text-paper-500" />
      <p className="mt-4 font-serif text-xl leading-snug font-medium text-paper">
        Nenhuma licença emitida ainda
      </p>
      <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-paper-300">
        Quando alguém licenciar uma foto sua, a compra aparece aqui com a data,
        o valor e a versão da licença aceita.
      </p>
      <Link
        href="/dashboard/minhas-fotos"
        className="mt-7 inline-block border border-paper/25 px-6 py-3.5 text-sm font-semibold tracking-[0.14em] text-paper-300 uppercase transition-colors hover:border-paper/50 hover:text-paper"
      >
        Ver minhas fotos
      </Link>
    </div>
  );
}
