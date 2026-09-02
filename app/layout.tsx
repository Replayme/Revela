import type { Metadata, Viewport } from 'next';
// Fontes auto-hospedadas (pacotes npm), não o Google Fonts: nenhuma requisição
// sai para servidores de terceiros e nada quebra se o build estiver offline.
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import { LocaleProvider } from '@/components/locale-provider';
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
