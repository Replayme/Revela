import { cookies } from 'next/headers';
import { verifySessionToken, type SessionPayload } from './tokens';
import { SESSION_COOKIE } from './session-cookie';

export { SESSION_COOKIE };

/**
 * Sessão de quem está pedindo a página, ou `null`.
 *
 * Um lugar só para ler o cookie: antes disto cada página repetia as três
 * linhas de `cookies()` + `verifySessionToken`, e a rota nova esquecia uma.
 *
 * Chamar isto torna a página dinâmica — é o preço de um header que sabe quem
 * está logado. Vale em todas as telas em que a resposta muda com a conta
 * (o painel, a foto que você já comprou, o recibo).
 */
export async function currentSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

/** O que o cliente pode saber da sessão: nunca o token, só a identidade. */
export interface PublicSession {
  id: string;
  name: string;
  email: string;
}

export function toPublicSession(
  session: SessionPayload | null,
): PublicSession | null {
  if (!session) return null;
  return { id: session.sub, name: session.name, email: session.email };
}
