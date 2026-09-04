import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LogoutButton } from '@/components/logout-button';
import { IconDownload, IconImage, IconLicense } from '@/components/icons';
import { ordersByUser } from '@/lib/repository';
import { findPhoto } from '@/lib/mock-photos';
import { UNIVERSAL_LICENSE } from '@/lib/license';
import { currentSession } from '@/lib/session';
import { formatDate, formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Minha conta',
  robots: { index: false, follow: false }, // tela de conta
};

/**
 * O painel da conta: as licenças que a pessoa comprou.
 *
 * Até aqui a compra emitia uma licença que não tinha onde ser vista — o pedido
 * ficava registrado e o arquivo, em lugar nenhum. Esta é a outra metade da
 * transação: a lista do que é seu, o recibo de cada item e o arquivo para
 * baixar.
 *
 * Rota protegida: sem sessão válida, volta para o login carregando o caminho
 * de volta. Em produção a mesma checagem tem que existir no `middleware.ts`,
 * para acontecer antes de qualquer render.
 */
export default async function DashboardPage() {
  const session = await currentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent('/dashboard')}`);

  // Um pedido cuja foto saiu do acervo não some da lista: a licença é
  // perpétua, e o que foi comprado continua sendo da pessoa.
  const orders = (await ordersByUser(session.sub)).map((order) => ({
    order,
    photo: findPhoto(order.photoId),
  }));

  const totalPago = orders.reduce((soma, item) => soma + item.order.pricePaid, 0);

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="tex-contact-sheet flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] tracking-[0.24em] text-amber uppercase">
                {session.email}
              </p>
              <h1 className="mt-3 font-serif text-[clamp(1.9rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
                {session.name}
              </h1>
            </div>
            <LogoutButton />
          </div>

          <section className="mt-10 border-t-2 border-paper/15 pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
              <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
                Minhas licenças
              </h2>
              {orders.length > 0 && (
                <p className="font-mono text-xs tracking-[0.16em] text-paper-500 uppercase">
                  {orders.length}{' '}
                  {orders.length === 1 ? 'licença' : 'licenças'}
                  <span aria-hidden> · </span>
                  {formatPrice(totalPago)}
                </p>
              )}
            </div>

            {orders.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="mt-7 grid gap-4">
                {orders.map(({ order, photo }) => (
                  <li key={order.id}>
                    <article className="grid grid-cols-[88px_1fr] gap-4 border border-paper/12 bg-prussia-950/50 p-3 transition-colors hover:border-amber/40 sm:grid-cols-[132px_1fr] sm:gap-6 sm:p-4">
                      <div className="relative aspect-[4/3] overflow-hidden bg-prussia-800">
                        {photo ? (
                          <Image
                            src={photo.thumbnailUrl}
                            alt=""
                            fill
                            sizes="132px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-paper-500">
                            <IconImage width={20} height={20} />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <h3 className="font-serif text-lg leading-snug font-medium text-paper">
                          <Link
                            href={`/pedido/${order.id}`}
                            className="transition-colors hover:text-amber"
                          >
                            {photo?.title ?? 'Foto fora do acervo'}
                          </Link>
                        </h3>
                        <p className="mt-1 truncate text-sm text-paper-300">
                          {photo ? `por ${photo.photographer.name}` : 'Autor não disponível'}
                        </p>

                        <p className="mt-2 font-mono text-[11px] tracking-[0.12em] text-paper-500 uppercase">
                          {formatDate(order.createdAt)}
                          <span aria-hidden> · </span>
                          {formatPrice(order.pricePaid)}
                          <span aria-hidden> · </span>
                          {UNIVERSAL_LICENSE.name} v{order.licenseVersion}
                        </p>

                        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-paper/10 pt-3">
                          <a
                            href={`/api/pedidos/${order.id}/arquivo`}
                            className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-amber uppercase transition-colors hover:text-amber-light"
                          >
                            <IconDownload width={14} height={14} />
                            Baixar arquivo
                          </a>
                          <Link
                            href={`/pedido/${order.id}`}
                            className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-paper-300 uppercase transition-colors hover:text-paper"
                          >
                            <IconLicense width={14} height={14} />
                            Recibo e licença
                          </Link>
                          {photo && (
                            <Link
                              href={`/foto/${photo.id}`}
                              className="text-[11px] font-medium tracking-[0.16em] text-paper-300 uppercase transition-colors hover:text-paper"
                            >
                              Ver no acervo
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-14 border-t border-paper/12 pt-7">
            <h2 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
              Painel do fotógrafo
            </h2>
            <p className="mt-3 max-w-[56ch] text-paper-300">
              O outro lado da conta: as fotos que você publicou e o que cada
              uma já rendeu. Enviar, editar e despublicar ainda não existem — a
              tela diz quais e por quê.
            </p>
            <Link
              href="/dashboard/minhas-fotos"
              className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-amber uppercase transition-colors hover:text-amber-light"
            >
              <IconImage width={14} height={14} />
              Minhas fotos
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * O vazio tem uma saída. Uma conta sem licença nenhuma é o estado normal de
 * quem acabou de se cadastrar, não um erro.
 */
function EmptyState() {
  return (
    <div className="mt-7 border border-dashed border-paper/20 px-6 py-14 text-center">
      <IconImage width={26} height={26} className="mx-auto text-paper-500" />
      <p className="mt-4 font-serif text-xl leading-snug font-medium text-paper">
        Você ainda não licenciou nenhuma foto
      </p>
      <p className="mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed text-paper-300">
        Toda foto do acervo sai com a mesma licença: uso ilimitado, para
        sempre, em qualquer meio. O que muda de uma para a outra é o preço do
        arquivo.
      </p>
      <Link
        href="/explorar"
        className="mt-7 inline-block bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
      >
        Ver o acervo
      </Link>
    </div>
  );
}
