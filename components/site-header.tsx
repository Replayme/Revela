'use client';

import Link from 'next/link';
import { useLocale } from './locale-provider';
import { useSession } from './session-provider';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';
import { IconSearch } from './icons';
import type { MessageKey } from '@/lib/i18n';

const NAV: { key: MessageKey; href: string }[] = [
  { key: 'header.nav.explore', href: '/explorar' },
  { key: 'header.nav.photographers', href: '/' },
  { key: 'header.nav.collections', href: '/' },
  { key: 'header.nav.pricing', href: '/' },
  { key: 'header.nav.sell', href: '/' },
];

/**
 * Header de duas faixas do Revela.
 *
 *  faixa 1 — busca em largura total
 *  faixa 2 — linha fina de navegação
 *
 * `variant="auth"`: nas telas de acesso a busca aparece em versão contida.
 * A busca é o elemento mais pesado do site, mas numa página cujo trabalho é
 * autenticar, o formulário precisa ganhar dela — senão a página não sabe o
 * que está pedindo. A estrutura de duas faixas continua idêntica.
 */
export function SiteHeader({ variant = 'full' }: { variant?: 'full' | 'auth' }) {
  const { t } = useLocale();
  const session = useSession();
  const compact = variant === 'auth';

  return (
    <header className="relative z-20 border-b border-paper/12 bg-prussia-950/85 backdrop-blur-sm">
      {/* faixa 1 — busca */}
      <div
        className={`mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 sm:px-6 lg:px-10 ${
          compact ? 'py-3' : 'py-5'
        }`}
      >
        <div className="shrink-0 text-paper">
          <Logo size={compact ? 'sm' : 'md'} />
        </div>

        <form
          role="search"
          action="/"
          className="flex min-w-0 flex-1 items-stretch"
          onSubmit={(event) => event.preventDefault()}
        >
          <label htmlFor="site-search" className="sr-only">
            {t('header.searchLabel')}
          </label>
          <div className="relative flex min-w-0 flex-1">
            <IconSearch
              width={18}
              height={18}
              className={`pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 ${
                compact ? 'text-paper-500' : 'text-prussia-300'
              }`}
            />
            <input
              id="site-search"
              type="search"
              placeholder={t('header.search')}
              className={`w-full min-w-0 rounded-none border border-paper/20 bg-prussia-900/70 py-2.5 pr-3 pl-10 text-paper placeholder:text-paper-500 focus:border-amber focus:outline-none ${
                compact
                  ? 'text-sm'
                  : 'text-sm sm:py-3.5 sm:text-base'
              }`}
            />
          </div>
          <button
            type="submit"
            className={`hidden shrink-0 border border-l-0 border-paper/20 px-5 text-[11px] font-semibold tracking-[0.16em] text-paper-300 uppercase transition-colors hover:bg-paper/10 hover:text-paper sm:block ${
              compact ? '' : ''
            }`}
          >
            {t('header.searchAction')}
          </button>
        </form>
      </div>

      {/* faixa 2 — navegação, linha fina */}
      <div className="border-t border-paper/12">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <nav
            aria-label={t('header.nav.explore')}
            className="scrollbar-none -mx-1 flex items-center gap-5 overflow-x-auto py-2 [mask-image:linear-gradient(to_right,black_86%,transparent)] sm:[mask-image:none]"
          >
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="shrink-0 px-1 text-[11px] font-medium tracking-[0.16em] text-paper-300 uppercase transition-colors hover:text-amber"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-4 py-2">
            <LanguageSwitcher />
            {session ? (
              <>
                {/* O nome some no celular; o que não pode sumir é o caminho
                    para as licenças — é o que a pessoa comprou. */}
                <span className="hidden max-w-[16ch] truncate text-[11px] font-medium tracking-[0.16em] text-paper-500 uppercase md:block">
                  {session.name}
                </span>
                <Link
                  href="/dashboard"
                  className="border border-amber/60 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-amber uppercase transition-colors hover:bg-amber hover:text-prussia-950"
                >
                  {t('header.account')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-[11px] font-medium tracking-[0.16em] text-paper-300 uppercase transition-colors hover:text-amber sm:block"
                >
                  {t('header.signin')}
                </Link>
                <Link
                  href="/cadastro-fotografo"
                  className="border border-amber/60 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-amber uppercase transition-colors hover:bg-amber hover:text-prussia-950"
                >
                  {t('header.signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
