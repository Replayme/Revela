import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { IconStar } from '@/components/icons';
import {
  findPhotographer,
  mockPhotographers,
} from '@/lib/mock-photographers';
import { photosByPhotographer } from '@/lib/mock-photos';
import { formatCount, formatPrice, formatRating } from '@/lib/format';

export function generateStaticParams() {
  return mockPhotographers.map((photographer) => ({ id: photographer.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const photographer = findPhotographer((await params).id);
  if (!photographer) return { title: 'Fotógrafo não encontrado' };
  return {
    title: `${photographer.name} — Revela`,
    description: `${formatCount(photographer.photoCount)} fotos publicadas no acervo do Revela.`,
  };
}

export default async function PhotographerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const photographer = findPhotographer((await params).id);
  if (!photographer) notFound();

  const fotos = photosByPhotographer(photographer.id);

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main className="flex-1">
        {/* Capa: um trabalho recente, como no card que trouxe a pessoa até aqui. */}
        <div className="relative h-[220px] bg-prussia-950 sm:h-[300px]">
          <Image
            src={photographer.coverPhotoUrl}
            alt={`Trabalho recente de ${photographer.name}`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-prussia-950/35"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-prussia-900 via-prussia-900/70 to-transparent"
          />
        </div>

        <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
          {/* `relative` aqui não é decoração: a capa é posicionada e pintaria
              por cima deste bloco, cortando o nome que a margem negativa
              sobrepõe a ela. */}
          <div className="relative -mt-12 flex flex-wrap items-end gap-5 sm:-mt-14">
            <div className="size-24 shrink-0 overflow-hidden border-[3px] border-paper bg-prussia-800 sm:size-28">
              <Image
                src={photographer.avatarUrl}
                alt={`Retrato de ${photographer.name}`}
                width={112}
                height={112}
                className="size-full object-cover"
              />
            </div>

            <div className="min-w-0 pb-1">
              <h1 className="font-serif text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
                {photographer.name}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-3 text-sm tabular-nums text-paper-300">
                <span>{formatCount(photographer.photoCount)} fotos publicadas</span>
                <span aria-hidden className="h-3 w-px bg-paper/25" />
                <span
                  className="flex items-center gap-1.5"
                  aria-label={`Avaliação ${formatRating(photographer.rating)} de 5`}
                >
                  {formatRating(photographer.rating)}
                  <IconStar width={13} height={13} />
                </span>
              </p>
            </div>
          </div>

          <section className="mt-12 border-t-2 border-paper/15 pt-8 pb-16">
            <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
              No acervo
            </h2>
            <p className="mt-2 text-sm text-paper-300">
              {fotos.length === photographer.photoCount
                ? `${formatCount(fotos.length)} fotos.`
                : `${formatCount(fotos.length)} de ${formatCount(photographer.photoCount)} fotos — o resto entra quando o acervo real substituir os dados de demonstração.`}
            </p>

            <ul className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {fotos.map((foto) => (
                <li key={foto.id}>
                  <Link
                    href={`/foto/${foto.id}`}
                    className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-prussia-950">
                      <Image
                        src={foto.thumbnailUrl}
                        alt={`${foto.title} — ${foto.category.toLowerCase()}`}
                        fill
                        sizes="(min-width: 1024px) 22vw, 45vw"
                        className="object-cover"
                      />
                    </div>
                    <h3 className="mt-2.5 font-serif text-base leading-snug text-paper">
                      {foto.title}
                    </h3>
                    <p className="mt-1 font-mono text-xs tabular-nums text-paper-500">
                      {formatPrice(foto.price)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
