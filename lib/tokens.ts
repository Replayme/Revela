import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Tudo que o servidor assina com a sua chave: o token de sessão e o token de
 * redefinição de senha.
 *
 * Os dois vivem no mesmo arquivo porque dependem do mesmo segredo, e um
 * segredo com dois donos é um segredo que um dia é lido de dois lugares
 * diferentes. Nenhuma das duas funções toca o armazenamento — é o que permite
 * que a implementação em memória e a do Postgres usem exatamente estas, sem
 * cópia.
 */

const AUTH_SECRET =
  process.env.AUTH_SECRET ?? 'dev-only-secret-troque-em-producao';

export const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/* ------------------------------ reset token ------------------------------ */

/**
 * O que vai para o banco.
 *
 * O valor bruto só existe no e-mail: quem lê a tabela de tokens não consegue
 * redefinir a senha de ninguém. HMAC e não SHA-256 puro porque o hash de um
 * token é curto e previsível em formato — com a chave no meio, uma tabela
 * roubada não é atacável offline sem também roubar o `AUTH_SECRET`.
 *
 * Consequência aceita: rotacionar o `AUTH_SECRET` invalida os tokens de reset
 * em aberto. São 24 horas de validade; quem estava no meio do fluxo pede outro.
 */
export function hashResetToken(token: string): string {
  return createHmac('sha256', AUTH_SECRET).update(token).digest('hex');
}

/** O valor bruto, que só quem recebe o e-mail vê. 32 bytes, base64url. */
export function newResetToken(): string {
  return randomBytes(32).toString('base64url');
}

/* -------------------------------- sessão --------------------------------- */

export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
  exp: number;
}

/**
 * Token de sessão assinado (HMAC-SHA256), no mesmo formato de um JWT compacto.
 *
 * ⚠️ Em produção use `jose`/`jsonwebtoken` com chave rotacionável e, se houver
 * refresh token, guarde-o no servidor para poder revogar. Hoje não há como
 * derrubar uma sessão antes do `exp` — o logout só apaga o cookie do
 * navegador, e um token copiado antes disso continua valendo.
 */
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
