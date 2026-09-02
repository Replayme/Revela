import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * "Banco" em memória — SOMENTE PARA DEMONSTRAÇÃO do fluxo de ponta a ponta.
 * Some a cada restart do servidor. Substitua por Postgres/Prisma.
 *
 * O que aqui já está certo e deve ser mantido em produção:
 *  - a senha nunca é guardada em texto plano (scrypt com salt por usuário);
 *  - a comparação de hashes é feita em tempo constante;
 *  - o token de reset é guardado como hash, não como o valor enviado no e-mail;
 *  - o token de reset expira em 24h e é de uso único.
 *
 * O que MUDA em produção: use argon2id (ou bcrypt cost >= 12) em vez de scrypt
 * manual, e assine sessões com uma biblioteca de JWT/`jose` com chave rotacionável.
 */

const SESSION_SECRET =
  process.env.AUTH_SECRET ?? 'dev-only-secret-troque-em-producao';

export const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // formato: scrypt$<salt hex>$<hash hex>
  disabled?: boolean;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const derived = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

// Contas de demonstração.
const users: User[] = [
  {
    id: 'usr_ana',
    name: 'Ana Ribeiro',
    email: 'ana@revela.com',
    passwordHash: hashPassword('Revela@2026'),
  },
  {
    id: 'usr_bruno',
    name: 'Bruno Sato',
    email: 'bruno@revela.com',
    passwordHash: hashPassword('contatoBruno1'),
  },
  {
    id: 'usr_off',
    name: 'Conta Desativada',
    email: 'desativada@revela.com',
    passwordHash: hashPassword('qualquercoisa1'),
    disabled: true,
  },
];

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email === normalized);
}

export function updatePassword(userId: string, password: string): boolean {
  const user = users.find((u) => u.id === userId);
  if (!user) return false;
  user.passwordHash = hashPassword(password);
  return true;
}

/* ------------------------------ reset tokens ----------------------------- */

interface ResetRecord {
  userId: string;
  tokenHash: string;
  expiresAt: number;
  usedAt?: number;
}

const resetTokens = new Map<string, ResetRecord>();

function hashToken(token: string): string {
  return createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
}

/** Cria o token de reset e devolve o valor bruto (só ele vai no e-mail). */
export function createResetToken(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  resetTokens.set(tokenHash, {
    userId,
    tokenHash,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  });
  return token;
}

export type ResetCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' };

export function consumeResetToken(token: string): ResetCheck {
  const record = resetTokens.get(hashToken(token));
  if (!record || record.usedAt) return { ok: false, reason: 'TOKEN_INVALID' };
  if (record.expiresAt < Date.now()) {
    resetTokens.delete(record.tokenHash);
    return { ok: false, reason: 'TOKEN_EXPIRED' };
  }
  record.usedAt = Date.now();
  resetTokens.delete(record.tokenHash);
  return { ok: true, userId: record.userId };
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
 * Em produção use `jose`/`jsonwebtoken` com chave rotacionável e, se houver
 * refresh token, guarde-o no servidor para poder revogar.
 */
export function issueSessionToken(user: User, remember: boolean): string {
  const ttlMs = remember ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const payload: SessionPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    exp: Math.floor((Date.now() + ttlMs) / 1000),
  };
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET)
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
  const expected = createHmac('sha256', SESSION_SECRET)
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
