import Link from 'next/link';

const COLUNAS: { titulo: string; itens: { rotulo: string; href: string }[] }[] = [
  {
    titulo: 'Navegar',
    itens: [
      { rotulo: 'O acervo', href: '/explorar' },
      { rotulo: 'Horizontais', href: '/explorar?orientacao=horizontal' },
      { rotulo: 'Verticais', href: '/explorar?orientacao=vertical' },
    ],
  },
  {
    titulo: 'Para fotógrafos',
    itens: [
      { rotulo: 'Criar perfil', href: '/cadastro-fotografo' },
      { rotulo: 'Entrar', href: '/login' },
    ],
  },
  {
    titulo: 'Legal',
    itens: [
      { rotulo: 'A licença', href: '/licenca' },
      { rotulo: 'Termos de uso', href: '/termos' },
      { rotulo: 'Privacidade', href: '/privacidade' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-paper/12 bg-prussia-950">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 sm:py-14 lg:px-10">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
          {COLUNAS.map((coluna) => (
            <div key={coluna.titulo}>
              <h2 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
                {coluna.titulo}
              </h2>
              <ul className="mt-4 grid gap-2.5">
                {coluna.itens.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-paper-300 transition-colors hover:text-amber"
                    >
                      {item.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
              Contato
            </h2>
            <ul className="mt-4 grid gap-2.5">
              <li>
                <a
                  href="mailto:oi@revela.com.br"
                  className="text-sm text-paper-300 transition-colors hover:text-amber"
                >
                  oi@revela.com.br
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-11 border-t border-paper/10 pt-6 text-xs text-paper-500">
          Revela · Natal, RN · As fotos exibidas pertencem aos seus autores.
        </p>
      </div>
    </footer>
  );
}
