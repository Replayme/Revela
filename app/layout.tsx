import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import { LocaleProvider } from '@/components/locale-provider';
import { SessionProvider } from '@/components/session-provider';
import { currentSession, toPublicSession } from '@/lib/session';
import { siteUrl } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Revela — marketplace de fotógrafos',
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
};

export const viewport: Viewport = {
  themeColor: '#0d2032',
  width: 'device-width',
  initialScale: 1,
};

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
