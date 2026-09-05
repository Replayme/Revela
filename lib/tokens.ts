import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const AUTH_SECRET =
  process.env.AUTH_SECRET ?? 'dev-only-secret-troque-em-producao';

export const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; 

export function hashResetToken(token: string): string {
  return createHmac('sha256', AUTH_SECRET).update(token).digest('hex');
}

export function newResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
  exp: number;
}

export function issueSessionToken(
  user: { id: string; name: string; email: string },
  remember: boolean,
): string {
  const payload: SessionPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds(remember),
  };
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function sessionMaxAgeSeconds(remember: boolean): number {
  return remember ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) return null;
  const expected = createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as SessionPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
