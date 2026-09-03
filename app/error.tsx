'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { IconAlert } from '@/components/icons';

/**
 * O boundary de erro do site — irmão do `not-found.tsx`.
 *
 * Sem ele, qualquer exceção em runtime caía na tela padrão do Next: branca,
 * fonte do sistema, sem header e sem saída.
 *
 * **A mensagem do erro não vai para a tela.** `error.message` de um componente
 * de servidor carrega caminho de arquivo e detalhe de implementação; quem
 * precisa disso é o log, não quem está tentando comprar uma foto. Em produção
 * o Next já substitui a mensagem por um texto genérico, mas o `digest` continua
 * indo junto — então o cuidado é aqui, não na confiança de que ele filtre.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção isto vira o cliente de observabilidade (Sentry e afins). O
    // `digest` é o que liga esta tela à entrada correspondente no log do
    // servidor.
    console.error('Erro não tratado:', error);
  }, [error]);

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="tex-contact-sheet flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[640px] px-5 py-20 text-center sm:px-8">
          <IconAlert width={30} height={30} className="mx-auto text-signal-error" />
          <p className="mt-5 font-mono text-[10px] tracking-[0.24em] text-amber uppercase">
            Erro inesperado
          </p>
          <h1 className="mt-4 font-serif text-[clamp(1.9rem,5vw,2.75rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            Alguma coisa quebrou aqui
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-paper-300">
            A falha é nossa, não sua. Tentar de novo costuma resolver — se
            insistir, o acervo continua acessível pelos caminhos abaixo.
          </p>

          {error.digest && (
            <p className="mt-6 font-mono text-xs text-paper-500">
              Código: <span className="text-paper-300">{error.digest}</span>
            </p>
          )}

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
            >
              Tentar de novo
            </button>
            <Link
              href="/explorar"
              className="border border-paper/25 px-6 py-3.5 text-sm font-semibold tracking-[0.14em] text-paper-300 uppercase transition-colors hover:border-paper/50 hover:text-paper"
            >
              Ver o acervo
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
