import { isDatabaseConfigured } from './db';
import { memoryStore } from './store-memory';
import type {
  CreateOrderResult,
  CreateUserResult,
  Order,
  ResetCheck,
  Store,
  User,
} from './model';

export type { CreateOrderResult, CreateUserResult, Order, ResetCheck, User };

/**
 * A porta única de entrada para os dados.
 *
 * Rotas e páginas importam **daqui**, nunca de `store-memory` ou
 * `store-sqlserver` — é o que permite trocar o armazenamento sem tocar em
 * nenhuma tela, e é o que faz a decisão de qual usar existir num lugar só.
 *
 * A escolha é pela configuração, não por um `NODE_ENV`: com as quatro
 * variáveis `SQLSERVER_*` definidas, é o banco; sem elas, é a memória. Assim
 * `npm run dev` funciona num clone recém-feito, e a mesma build que roda na
 * Vercel roda apontada para um SQL Server local sem recompilar nada.
 *
 * O import do SQL Server é dinâmico de propósito. Numa função serverless o
 * que custa é o *cold start*, e avaliar o driver `mssql` em toda instância que
 * nunca vai falar com banco nenhum é custo puro. Todas as funções já são
 * assíncronas, então o `await` extra não muda a forma de nada.
 */

let cached: Store | undefined;

async function getStore(): Promise<Store> {
  if (cached) return cached;

  if (!isDatabaseConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      // Uma linha no log de produção, não uma exceção: derrubar o site inteiro
      // por causa de variável faltando esconderia todo o resto do diagnóstico.
      // Mas ninguém pode achar que os dados estão salvos quando não estão.
      console.warn(
        '[revela] SQL Server não configurado — usando armazenamento em memória. ' +
          'Cadastros e pedidos somem a cada instância. Ver docs/BANCO.md.',
      );
    }
    return (cached = memoryStore);
  }

  const { sqlServerStore } = await import('./store-sqlserver');
  return (cached = sqlServerStore);
}

/* ------------------------------- usuários -------------------------------- */

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return (await getStore()).findUserByEmail(email);
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<CreateUserResult> {
  return (await getStore()).createUser(input);
}

export async function updatePassword(
  userId: string,
  password: string,
): Promise<boolean> {
  return (await getStore()).updatePassword(userId, password);
}

/* --------------------------- redefinição de senha ------------------------ */

/** Cria o token e devolve o valor bruto — só ele vai no e-mail. */
export async function createResetToken(userId: string): Promise<string> {
  return (await getStore()).createResetToken(userId);
}

export async function consumeResetToken(token: string): Promise<ResetCheck> {
  return (await getStore()).consumeResetToken(token);
}

/* -------------------------------- pedidos -------------------------------- */

export async function createOrder(input: {
  userId: string;
  photoId: string;
  pricePaid: number;
  licenseVersion: string;
}): Promise<CreateOrderResult> {
  return (await getStore()).createOrder(input);
}

export async function findOrder(
  userId: string,
  photoId: string,
): Promise<Order | undefined> {
  return (await getStore()).findOrder(userId, photoId);
}

export async function ordersByUser(userId: string): Promise<Order[]> {
  return (await getStore()).ordersByUser(userId);
}

export async function findOrderById(
  userId: string,
  orderId: string,
): Promise<Order | undefined> {
  return (await getStore()).findOrderById(userId, orderId);
}

/** ⚠️ Não filtrado por dono — leia o comentário na implementação antes de usar. */
export async function ordersByPhoto(photoId: string): Promise<Order[]> {
  return (await getStore()).ordersByPhoto(photoId);
}

/* ------------------------------- favoritos ------------------------------- */

export async function favoritesByUser(userId: string): Promise<string[]> {
  return (await getStore()).favoritesByUser(userId);
}

export async function isFavorited(
  userId: string,
  photoId: string,
): Promise<boolean> {
  return (await getStore()).isFavorited(userId, photoId);
}

/** Alterna e devolve o estado que ficou. */
export async function toggleFavorite(
  userId: string,
  photoId: string,
): Promise<boolean> {
  return (await getStore()).toggleFavorite(userId, photoId);
}
