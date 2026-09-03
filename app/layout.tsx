import type { Metadata, Viewport } from 'next';
// Fontes auto-hospedadas (pacotes npm), não o Google Fonts: nenhuma requisição
// sai para servidores de terceiros e nada quebra se o build estiver offline.
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import { LocaleProvider } from '@/components/locale-provider';
import { SessionProvider } from '@/components/session-provider';
import { currentSession, toPublicSession } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revela — marketplace de fotógrafos',
  description:
    'Publique, licencie e venda suas fotografias. Acesso à sua conta Revela.',
  robots: { index: false, follow: false }, // telas de conta não vão para busca
};

export const viewport: Viewport = {
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
