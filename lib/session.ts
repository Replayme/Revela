import { cookies } from 'next/headers';
import { verifySessionToken, type SessionPayload } from './tokens';
import { SESSION_COOKIE } from './session-cookie';

export { SESSION_COOKIE };

export async function currentSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

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
