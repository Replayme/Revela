import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PhotographerStats } from '@/components/photographer-stats';
import { PhotographerPhotoCard } from '@/components/photographer-photo-card';
import { IconArrowLeft, IconImage, IconUpload } from '@/components/icons';
import { painelDoAutor } from '@/lib/mock-photographer-panel';
import { summarize } from '@/lib/photographer-panel';
import { currentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Minhas fotos',
  robots: { index: false, follow: false }, // tela de conta
};

/**
 * O painel de quem publica — a outra metade de `/dashboard`, que até aqui só
 * sabia da conta de quem compra.
 *
 * **É uma tela de leitura, e de propósito.** Publicar, despublicar, editar e
 * remover não têm para onde ir: não existe `POST /api/fotos` nem `PATCH` por
 * id, e o arquivo enviado não teria onde ser guardado. Então os botões não
 * aparecem — os componentes já seguem essa regra, a mesma do botão de
 * favoritar no card do acervo. Uma tela que oferece "Publicar" e não publica é
 * pior que uma tela que ainda não oferece.
 *
 * O que ela mostra é verdade conferível: as fotos que estão no acervo, e as
 * vendas contadas nos pedidos que existem de fato.
 */
export default async function MinhasFotosPage() {
  const session = await currentSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent('/dashboard/minhas-fotos')}`);
  }

  const painel = painelDoAutor(session.email);

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="tex-contact-sheet flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper"
          >
            <IconArrowLeft width={13} height={13} />
            Minha conta
          </Link>

          <h1 className="mt-5 font-serif text-[clamp(1.9rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            Minhas fotos
          </h1>

          {painel ? (
            <Painel painel={painel} />
          ) : (
            <ContaSemAutor />
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Painel({ painel }: { painel: NonNullable<ReturnType<typeof painelDoAutor>> }) {
  const { photographer, photos } = painel;
  const resumo = summarize(photos);

  return (
    <>
      {/*
        A assinatura é dita porque pode não ser o nome da conta — e no acervo
        de demonstração não é: quem entra como Ana Ribeiro assina Ana Vilar.
        Isso não é defeito do vínculo, é como fotógrafo trabalha: o nome da
        conta é de quem recebe, a assinatura é de quem fotografa. A tela
        precisa dizer qual dos dois vai sair embaixo da foto.
      */}
      <p className="mt-3 text-paper-300">
        No acervo, suas fotos assinam{' '}
        <Link
          href={`/perfil/${photographer.id}`}
          className="font-medium text-paper underline decoration-paper/30 decoration-2 underline-offset-4 transition-colors hover:decoration-amber"
        >
          {photographer.name}
        </Link>
        .
      </p>

      <div className="mt-8">
        <PhotographerStats summary={resumo} />
      </div>

      <section className="mt-12 border-t-2 border-paper/15 pt-8">
        <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
          No acervo
        </h2>

        {photos.length === 0 ? (
          <AcervoVazio />
        ) : (
          <ul className="mt-7 grid gap-4">
            {photos.map((photo) => (
              <li key={photo.id}>
                {/*
                  Sem `editHref` e sem manipuladores: o card então não mostra
                  ação nenhuma. Um link para uma tela de edição que não existe
                  seria o décimo link morto do site — nove saíram no commit
                  anterior.
                */}
                <PhotographerPhotoCard photo={photo} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <PorVir />
    </>
  );
}

/**
 * A conta existe e não é de um autor.
 *
 * Não é erro nem falta de permissão: é quem entrou para comprar e chegou aqui.
 * A saída é o cadastro de fotógrafo, que já existe.
 */
function ContaSemAutor() {
  return (
    <>
      <p className="mt-3 max-w-[56ch] text-paper-300">
        Esta conta ainda não publica no acervo.
      </p>

      <div className="mt-9 border border-dashed border-paper/20 px-6 py-14 text-center">
        <IconUpload width={26} height={26} className="mx-auto text-paper-500" />
        <p className="mt-4 font-serif text-xl leading-snug font-medium text-paper">
          Você ainda não é um autor no Revela
        </p>
        <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-paper-300">
          Quem publica aqui vende a mesma licença que compra: uso ilimitado,
          para sempre, sem prazo e sem comissão. O preço de cada arquivo é de
          quem o fez.
        </p>
        <Link
          href="/cadastro-fotografo"
          className="mt-7 inline-block bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
        >
          Cadastrar como fotógrafo
        </Link>
      </div>
    </>
  );
}

/** Autor sem nenhuma foto no acervo — possível, e não é o mesmo que erro. */
function AcervoVazio() {
  return (
    <div className="mt-7 border border-dashed border-paper/20 px-6 py-14 text-center">
      <IconImage width={26} height={26} className="mx-auto text-paper-500" />
      <p className="mt-4 font-serif text-xl leading-snug font-medium text-paper">
        Nenhuma foto sua está no acervo
      </p>
      <p className="mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed text-paper-300">
        Quando o envio existir, é aqui que as fotos publicadas aparecem, com o
        que cada uma já rendeu.
      </p>
    </div>
  );
}

/**
 * O que a tela ainda não faz, dito na própria tela.
 *
 * Não é rodapé de cortesia: quem abre um painel de vendas e não acha o botão
 * de publicar precisa saber se ele está escondido ou se ainda não existe.
 */
function PorVir() {
  return (
    <section className="mt-14 border-t border-paper/12 pt-7">
      <h2 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
        Ainda não é possível
      </h2>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-paper-300">
        Enviar foto nova, editar a ficha de uma publicada, despublicar ou
        remover. As três primeiras dependem de{' '}
        <code className="font-mono text-paper-400">POST /api/fotos</code> e do
        lugar onde o arquivo vai ser guardado; a última, de decidir o que
        acontece com as licenças já emitidas — elas continuam valendo, e é isso
        que torna remover diferente de apagar.
      </p>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-paper-300">
        Até lá o painel mostra o que dá para conferir, e não oferece botão sem
        quem o atenda.
      </p>
    </section>
  );
}
