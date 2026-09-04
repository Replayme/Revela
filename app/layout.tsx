import type { Metadata, Viewport } from 'next';
// Fontes auto-hospedadas (pacotes npm), não o Google Fonts: nenhuma requisição
// sai para servidores de terceiros e nada quebra se o build estiver offline.
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import { LocaleProvider } from '@/components/locale-provider';
import { SessionProvider } from '@/components/session-provider';
import { currentSession, toPublicSession } from '@/lib/session';
import { siteUrl } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  // Sem `metadataBase`, as imagens de Open Graph saem como caminho relativo e
  // nenhum leitor de link resolve — a foto some justamente do lugar onde ela é
  // o produto. Ver `lib/site.ts`.
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Revela — marketplace de fotógrafos',
    // As páginas declaram só o próprio nome; o sufixo entra aqui, num lugar
    // só. Antes o template era '%s' — um no-op — e cada página repetia
    // "— Revela" à mão.
    template: '%s — Revela',
  },
  description:
    'Fotos de fotógrafos independentes, com uma licença só: uso ilimitado, para sempre, em qualquer meio.',
  openGraph: {
    siteName: 'Revela',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  // O `noindex` já esteve aqui, quando o projeto era só a tela de login. Num
  // marketplace ele esconde a home, o acervo, as fotos e os perfis — tudo que
  // precisa ser achado. Hoje vale por página: cada tela de conta traz o seu
  // (app/login/layout.tsx e as irmãs, /dashboard, /pedido).
};

export const viewport: Viewport = {
  // Um valor só para um site de duas caras: a home é papel claro, todo o resto
  // é prússia escuro. Fica no escuro de propósito — barra escura sobre a home
  // clara lê como uma faixa de header, enquanto barra clara sobre as páginas
  // escuras (que são a maioria, e onde se passa mais tempo) lê como página
  // cortada. Não dá para acertar nas duas com um valor: `prefers-color-scheme`
  // não ajuda, porque o que muda aqui é a página, não a preferência de quem vê.
  themeColor: '#0d2032',
  width: 'device-width',
  initialScale: 1,
};

/**
 * O layout lê a sessão para o header saber quem está logado em toda página —
 * inclusive nas de cliente, como a home, que não conseguem ler o cookie.
 *
 * Ler cookie no layout torna o site inteiro dinâmico. É uma troca consciente:
 * um header que oferece "Entrar" para quem já entrou é pior do que perder a
 * geração estática de páginas que, hoje, leem um acervo em memória. Quando o
 * acervo virar banco, a home volta a ser estática com o header saindo daqui
 * para um componente próprio, embrulhado em Suspense.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = toPublicSession(await currentSession());

  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <SessionProvider session={session}>
          <LocaleProvider>{children}</LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
