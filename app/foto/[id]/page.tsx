import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { BuyButton } from '@/components/buy-button';
import { IconCheck, IconStar } from '@/components/icons';
import { findOrder } from '@/lib/mock-db';
import { findPhoto, mockPhotos, photosByPhotographer } from '@/lib/mock-photos';
import { findPhotographer } from '@/lib/mock-photographers';
import { UNIVERSAL_LICENSE, licenseLabel } from '@/lib/license';
import { currentSession } from '@/lib/session';
import { formatCount, formatPrice, formatRating } from '@/lib/format';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return mockPhotos.map((photo) => ({ id: photo.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const photo = findPhoto((await params).id);
  if (!photo) return { title: 'Foto não encontrada' };
  const description = `${photo.category} por ${photo.photographer.name}. ${UNIVERSAL_LICENSE.summary}`;

  return {
    title: `${photo.title} — ${photo.photographer.name}`,
    description,
    openGraph: {
      title: photo.title,
      description,
      type: 'article',
      images: [
        {
          url: photo.thumbnailUrl,
          width: 800,
          height: 600,
          alt: `${photo.title}, por ${photo.photographer.name}`,
        },
      ],
    },
  };
}

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const photo = findPhoto((await params).id);
  if (!photo) notFound();

  const session = await currentSession();
  const pedido = session ? findOrder(session.sub, photo.id) : undefined;

  const photographer = findPhotographer(photo.photographer.id);
  const outras = photosByPhotographer(photo.photographer.id).filter(
    (outra) => outra.id !== photo.id,
  );

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8 sm:py-14">
          <nav aria-label="Trilha" className="text-xs text-paper-500">
            <Link href="/explorar" className="hover:text-paper">
              Acervo
            </Link>
            <span aria-hidden> · </span>
            <span>{photo.category}</span>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-12">
            <div>
              <div
                className="relative bg-prussia-950"
                style={{
                  aspectRatio:
                    photo.orientation === 'vertical' ? '3 / 4' : '4 / 3',
                }}
              >
                <Image
                  src={photo.thumbnailUrl}
                  alt={`${photo.title} — ${photo.category.toLowerCase()}, por ${photo.photographer.name}`}
                  fill
                  sizes="(min-width: 1024px) 62vw, 92vw"
                  className="object-cover"
                  priority
                />
              </div>
              <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-paper-500 uppercase">
                Marca d’água na pré-visualização · o arquivo entregue vem limpo
              </p>
            </div>

            <div>
              <h1 className="font-serif text-[clamp(1.7rem,3.4vw,2.4rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
                {photo.title}
              </h1>

              <p className="mt-3 text-paper-300">
                por{' '}
                <Link
                  href={`/perfil/${photo.photographer.id}`}
                  className="font-medium text-paper underline decoration-amber decoration-2 underline-offset-4"
                >
                  {photo.photographer.name}
                </Link>
              </p>

              <dl className="mt-7 grid grid-cols-2 gap-px border border-paper/12 bg-paper/12 text-sm">
                <Dado rotulo="Categoria" valor={photo.category} />
                <Dado
                  rotulo="Orientação"
                  valor={
                    photo.orientation === 'vertical' ? 'Vertical' : 'Horizontal'
                  }
                />
                <Dado
                  rotulo="Resolução"
                  valor={`${formatCount(photo.width)} × ${formatCount(photo.height)} px`}
                />
                <Dado
                  rotulo="Avaliação"
                  valor={
                    <span className="inline-flex items-center gap-1.5">
                      {formatRating(photo.rating)}
                      <IconStar width={12} height={12} />
                    </span>
                  }
                />
              </dl>

              <div className="mt-8 border-t-2 border-paper/15 pt-6">
                <p className="font-serif text-3xl leading-none text-paper">
                  {formatPrice(photo.price)}
                </p>
                <p className="mt-2 text-sm text-paper-300">
                  {UNIVERSAL_LICENSE.summary}
                </p>

                <div className="mt-6">
                  <BuyButton
                    photoId={photo.id}
                    price={photo.price}
                    isSignedIn={Boolean(session)}
                    orderId={pedido?.id ?? null}
                  />
                </div>
              </div>

              <section className="mt-9 border-t border-paper/12 pt-6">
                <h2 className="font-mono text-[10px] tracking-[0.22em] text-paper-500 uppercase">
                  {licenseLabel()}
                </h2>
                <ul className="mt-4 grid gap-2.5">
                  {UNIVERSAL_LICENSE.permissions.slice(0, 3).map((item) => (
                    <li key={item} className="grid grid-cols-[16px_1fr] gap-2.5">
                      <IconCheck
                        width={14}
                        height={14}
                        className="mt-1 text-signal-ok"
                      />
                      <span className="text-sm leading-relaxed text-paper-300">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4">
                  <Link
                    href="/licenca"
                    className="text-sm font-medium text-paper underline decoration-amber decoration-2 underline-offset-4"
                  >
                    Ler a licença inteira
                  </Link>
                </p>
              </section>
            </div>
          </div>

          {outras.length > 0 && (
            <section className="mt-16 border-t border-paper/12 pt-10">
              <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
                Mais de {photo.photographer.name}
              </h2>
              <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {outras.slice(0, 4).map((outra) => (
                  <li key={outra.id}>
                    <Link
                      href={`/foto/${outra.id}`}
                      className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-prussia-950">
                        <Image
                          src={outra.thumbnailUrl}
                          alt={outra.title}
                          fill
                          sizes="(min-width: 1024px) 22vw, 45vw"
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-2 text-sm leading-snug text-paper-300 group-hover:text-paper">
                        {outra.title}
                      </p>
                      <p className="mt-0.5 font-mono text-xs tabular-nums text-paper-500">
                        {formatPrice(outra.price)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              {photographer && (
                <p className="mt-6">
                  <Link
                    href={`/perfil/${photographer.id}`}
                    className="text-sm font-medium text-paper underline decoration-amber decoration-2 underline-offset-4"
                  >
                    Ver o perfil de {photographer.name}
                  </Link>
                </p>
              )}
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Dado({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="bg-prussia-900 px-4 py-3">
      <dt className="font-mono text-[10px] tracking-[0.16em] text-paper-500 uppercase">
        {rotulo}
      </dt>
      <dd className="mt-1 text-paper">{valor}</dd>
    </div>
  );
}
