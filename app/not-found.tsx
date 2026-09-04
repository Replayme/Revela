import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { IconImage } from '@/components/icons';

export const metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: true },
};

/**
 * O 404 do site.
 *
 * Sem esta página, todo endereço errado caía no 404 cru do Next: fundo branco,
 * fonte do sistema, nenhum header e nenhuma saída. Quem erra o endereço de uma
 * foto continua querendo achar uma foto — daí o caminho para o acervo em vez
 * de um "voltar" genérico.
 */
export default function NotFound() {
  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="tex-contact-sheet flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[640px] px-5 py-20 text-center sm:px-8">
          <IconImage width={30} height={30} className="mx-auto text-paper-500" />
          <p className="mt-5 font-mono text-[10px] tracking-[0.24em] text-amber uppercase">
            Erro 404
          </p>
          <h1 className="mt-4 font-serif text-[clamp(1.9rem,5vw,2.75rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            Esta página não existe
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-paper-300">
            O endereço pode ter mudado, ou a foto pode ter saído do acervo. A
            busca continua aberta.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explorar"
              className="bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
            >
              Ver o acervo
            </Link>
            <Link
              href="/"
              className="border border-paper/25 px-6 py-3.5 text-sm font-semibold tracking-[0.14em] text-paper-300 uppercase transition-colors hover:border-paper/50 hover:text-paper"
            >
              Ir para a home
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
