import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Barreira das rotas privadas, antes de qualquer render.
 *
 * **Aqui só se confere se o cookie existe — não a assinatura.**
 *
 * O middleware roda no runtime de edge, onde `node:crypto` não existe, e é com
 * `node:crypto` que `lib/tokens.ts` verifica o HMAC da sessão. Havia duas
 * saídas: forçar o middleware para o runtime Node, ou deixá-lo fazer só a
 * checagem barata. A segunda foi a escolhida porque a primeira paga o custo do
 * runtime Node em *toda* requisição que casa com o `matcher`, para repetir uma
 * verificação que a página vai fazer de novo logo em seguida.
 *
 * A consequência é que um cookie forjado passa por aqui — e morre na página,
 * que verifica a assinatura de verdade (`currentSession`). É por isso que as
 * duas camadas continuam existindo, como o `docs/API.md` §9 pede: esta corta o
 * tráfego óbvio de quem não fez login, aquela decide.
 *
 * O que **não** se faz é duplicar a verificação de assinatura nos dois lugares.
 * Duas cópias da mesma regra divergem no dia em que uma for corrigida.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  // A API responde em JSON: mandar um `fetch` para a tela de login devolveria
  // HTML com status 200, e quem chamou trataria como sucesso.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/dashboard/:path*', '/pedido/:path*', '/api/pedidos/:path*', '/api/favoritos/:path*'],
};
