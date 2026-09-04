import Link from 'next/link';
import { IconUpload } from './icons';

/**
 * A conta existe e não publica no acervo.
 *
 * Não é erro nem falta de permissão: é quem entrou para comprar e chegou a uma
 * tela de quem vende. A saída é o cadastro de fotógrafo, que já existe — por
 * isso a tela oferece o caminho em vez de só barrar.
 *
 * Mora aqui, e não dentro de uma das telas, porque as duas do painel precisam
 * dela e é a mesma resposta: a segunda cópia divergiria da primeira no dia em
 * que uma fosse corrigida.
 */
export function NotAnAuthor() {
  return (
    <div className="mt-9 border border-dashed border-paper/20 px-6 py-14 text-center">
      <IconUpload width={26} height={26} className="mx-auto text-paper-500" />
      <p className="mt-4 font-serif text-xl leading-snug font-medium text-paper">
        Você ainda não é um autor no Revela
      </p>
      <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-paper-300">
        Quem publica aqui vende a mesma licença que compra: uso ilimitado, para
        sempre, sem prazo e sem comissão. O preço de cada arquivo é de quem o
        fez.
      </p>
      <Link
        href="/cadastro-fotografo"
        className="mt-7 inline-block bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
      >
        Cadastrar como fotógrafo
      </Link>
    </div>
  );
}
