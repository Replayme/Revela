import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/mock-db';
import { LogoutButton } from '@/components/logout-button';
import { Logo } from '@/components/logo';

export const dynamic = 'force-dynamic';

/**
 * Destino do redirecionamento automático após o login.
 * Serve também de exemplo de rota protegida: sem cookie de sessão válido,
 * volta para /login. Em produção, faça esta checagem também no middleware.
 */
export default async function DashboardPage() {
  const token = (await cookies()).get('revela_session')?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) redirect('/login');

  return (
    <div className="tex-cyanotype flex min-h-dvh flex-col bg-prussia-900">
      <header className="border-b border-paper/12 bg-prussia-950/85">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-4 text-paper sm:px-6 lg:px-10">
          <Logo size="sm" />
          <LogoutButton />
        </div>
      </header>

      <main className="tex-contact-sheet flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
          <p className="font-mono text-[10px] tracking-[0.24em] text-amber uppercase">
            {session.email}
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,3.25rem)] leading-tight font-medium tracking-[-0.02em] text-paper">
            {session.name}
          </h1>
          <p className="mt-4 max-w-[52ch] text-paper-300">
            Painel do fotógrafo — espaço reservado. Você chegou aqui pelo
            redirecionamento automático após o login.
          </p>
        </div>
      </main>
    </div>
  );
}
