import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { IconCheck, IconAlert } from '@/components/icons';
import { UNIVERSAL_LICENSE } from '@/lib/license';

export const metadata = {
  title: 'A licença',
};

/**
 * O texto integral da licença. É para onde apontam o card da foto, o aceite
 * do cadastro e o recibo do pedido — quem lê aqui precisa entender sem
 * precisar de advogado do lado.
 */
export default function LicensePage() {
  const license = UNIVERSAL_LICENSE;

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <SiteHeader variant="auth" />

      <main id="conteudo" className="flex-1">
        <div className="mx-auto w-full max-w-[760px] px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
            {license.name} · v{license.version} · {license.updatedAt}
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,3rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            Uma licença, todos os usos
          </h1>
          <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-paper-300">
            {license.summary}
          </p>
          <p className="mt-4 max-w-[58ch] text-paper-300">
            Não existe faixa pessoal, comercial ou editorial no Revela. Quem
            compra não precisa adivinhar em qual uso vai cair, e quem vende não
            precisa fiscalizar a diferença: o preço é do arquivo, não do uso.
          </p>

          <section className="mt-12 border-t-2 border-paper/15 pt-7">
            <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
              O que você pode fazer
            </h2>
            <ul className="mt-5 grid gap-3.5">
              {license.permissions.map((item) => (
                <li key={item} className="grid grid-cols-[18px_1fr] gap-3">
                  <IconCheck
                    width={16}
                    height={16}
                    className="mt-1 text-signal-ok"
                  />
                  <span className="text-paper-300">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-11 border-t-2 border-paper/15 pt-7">
            <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
              O que a licença não cobre
            </h2>
            <ul className="mt-5 grid gap-3.5">
              {license.restrictions.map((item) => (
                <li key={item} className="grid grid-cols-[18px_1fr] gap-3">
                  <IconAlert
                    width={16}
                    height={16}
                    className="mt-1 text-signal-error"
                  />
                  <span className="text-paper-300">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-11 border-t-2 border-paper/15 pt-7">
            <h2 className="font-serif text-2xl leading-tight font-medium text-paper">
              Como a versão funciona
            </h2>
            <p className="mt-4 text-paper-300">
              Cada pedido guarda a versão da licença aceita naquele dia. Se este
              texto mudar, a versão sobe — e quem comprou antes continua com a
              licença que aceitou, não com a nova.
            </p>
          </section>

          <p className="mt-12 flex items-start gap-2.5 border border-dashed border-paper/25 px-4 py-3.5 text-sm text-paper-300">
            <IconAlert width={15} height={15} className="mt-0.5 shrink-0" />
            Redação de trabalho, ainda sem revisão jurídica. Antes de abrir o
            site é preciso passar por quem responde por isso.
          </p>

          <p className="mt-8">
            <Link
              href="/explorar"
              className="text-sm font-medium text-paper underline decoration-amber decoration-2 underline-offset-4"
            >
              Ver o acervo
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
