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

/**
 * Estado mutável do mock, guardado no `globalThis`.
 *
 * Rotas de API e componentes de servidor são empacotados separadamente: cada
 * bundle carrega a sua cópia deste módulo, com o seu próprio array. Sem um
 * ponto comum, a compra registrada pela rota some quando a página vai ler —
 * foi exatamente o que aconteceu no teste. `globalThis` é o mesmo objeto para
 * todos os bundles do processo; é o truque que a documentação do Prisma usa
 * pelo mesmo motivo.
 *
 * Continua valendo para UM processo. Em serverless cada instância tem a sua
 * memória, e nem isto salva — é mais uma razão para o banco real entrar aqui.
 */
interface MockStore {
  users: User[];
  orders: Order[];
  resetTokens: Map<string, ResetRecord>;
}

const globalStore = globalThis as typeof globalThis & {
  __revelaMockStore?: MockStore;
};

// Contas de demonstração.
const seedUsers: User[] = [
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

const store: MockStore = (globalStore.__revelaMockStore ??= {
  users: seedUsers,
  orders: [],
  resetTokens: new Map(),
});

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email === normalized);
}

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'EMAIL_TAKEN' };

/**
 * Cria a conta do fotógrafo.
 *
 * O e-mail é normalizado (minúsculas, sem espaços nas pontas) antes de virar
 * chave: sem isso "Ana@Revela.com" abriria uma segunda conta e ninguém mais
 * conseguiria entrar em nenhuma das duas com certeza.
 *
 * Em produção a unicidade tem que ser um índice único na coluna, não esta
 * verificação — entre o `findUserByEmail` e o `push` cabe outra requisição.
 */
export function createUser(input: {
  name: string;
  email: string;
  password: string;
}): CreateUserResult {
  const email = input.email.trim().toLowerCase();
  if (findUserByEmail(email)) return { ok: false, reason: 'EMAIL_TAKEN' };

  const user: User = {
    id: `usr_${randomBytes(8).toString('hex')}`,
    name: input.name.trim(),
    email,
    passwordHash: hashPassword(input.password),
  };
  store.users.push(user);
  return { ok: true, user };
}

export function updatePassword(userId: string, password: string): boolean {
  const user = store.users.find((u) => u.id === userId);
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

function hashToken(token: string): string {
  return createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
}

/** Cria o token de reset e devolve o valor bruto (só ele vai no e-mail). */
export function createResetToken(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  store.resetTokens.set(tokenHash, {
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
  const record = store.resetTokens.get(hashToken(token));
  if (!record || record.usedAt) return { ok: false, reason: 'TOKEN_INVALID' };
  if (record.expiresAt < Date.now()) {
    store.resetTokens.delete(record.tokenHash);
    return { ok: false, reason: 'TOKEN_EXPIRED' };
  }
  record.usedAt = Date.now();
  store.resetTokens.delete(record.tokenHash);
  return { ok: true, userId: record.userId };
}

/* -------------------------------- pedidos -------------------------------- */

export interface Order {
  id: string;
  userId: string;
  photoId: string;
  /** Preço no momento da compra: mudar a tabela não muda o que já foi pago. */
  pricePaid: number;
  /** Versão da licença aceita: reescrever o texto não altera pedidos antigos. */
  licenseVersion: string;
  createdAt: number;
}

export function createOrder(input: {
  userId: string;
  photoId: string;
  pricePaid: number;
  licenseVersion: string;
}): Order {
  const order: Order = {
    id: `ord_${randomBytes(8).toString('hex')}`,
    createdAt: Date.now(),
    ...input,
  };
  store.orders.push(order);
  return order;
}

export function findOrder(userId: string, photoId: string): Order | undefined {
  return store.orders.find((o) => o.userId === userId && o.photoId === photoId);
}

export function ordersByUser(userId: string): Order[] {
  return store.orders.filter((o) => o.userId === userId);
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
