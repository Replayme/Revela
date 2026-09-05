import Link from 'next/link';
import { IconUpload } from './icons';

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
