import { isDatabaseConfigured } from './db';
import { memoryStore } from './store-memory';
import type {
  Category,
  NewPhoto,
  CreateOrderResult,
  CreateUserResult,
  Order,
  Photo,
  Photographer,
  PhotoPatch,
  PhotoStatus,
  ResetCheck,
  Store,
  StoredPhoto,
  User,
} from './model';

export type {
  Category,
  NewPhoto,
  CreateOrderResult,
  CreateUserResult,
  Order,
  Photo,
  Photographer,
  PhotoPatch,
  PhotoStatus,
  ResetCheck,
  StoredPhoto,
  User,
};

/**
 * A porta única de entrada para os dados.
 *
 * Rotas e páginas importam **daqui**, nunca de `store-memory` ou
 * `store-postgres` — é o que permite trocar o armazenamento sem tocar em
 * nenhuma tela, e é o que faz a decisão de qual usar existir num lugar só.
 *
 * A escolha é pela configuração, não por um `NODE_ENV`: com `DATABASE_URL`
 * definida, é o banco; sem ela, é a memória. Assim `npm run dev` funciona num
 * clone recém-feito, e a mesma build que roda na Vercel roda apontada para
 * qualquer Postgres sem recompilar nada.
 *
 * O import do Postgres é dinâmico de propósito. Numa função serverless o que
 * custa é o *cold start*, e avaliar o driver em toda instância que nunca vai
 * falar com banco nenhum é custo puro. Todas as funções já são assíncronas,
 * então o `await` extra não muda a forma de nada.
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
        '[revela] DATABASE_URL ausente — usando armazenamento em memória. ' +
          'Cadastros e pedidos somem a cada instância. Ver docs/BANCO.md.',
      );
    }
    return (cached = memoryStore);
  }

  const { postgresStore } = await import('./store-postgres');
  return (cached = postgresStore);
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

/** As licenças emitidas das fotos de um autor, da mais recente para a mais antiga. */
export async function ordersByAuthor(photographerId: string): Promise<Order[]> {
  return (await getStore()).ordersByAuthor(photographerId);
}

/** Vendas e receita por foto do autor, num `GROUP BY`. Foto sem venda não aparece. */
export async function salesByAuthor(
  photographerId: string,
): Promise<Record<string, { sales: number; revenue: number }>> {
  return (await getStore()).salesByAuthor(photographerId);
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

/* -------------------------------- acervo --------------------------------- */

/** O acervo publicado. Sem `category`, o acervo inteiro. */
export async function listPhotos(options: { category?: string } = {}): Promise<StoredPhoto[]> {
  return (await getStore()).listPhotos(options);
}

/** Uma foto **do acervo**. Rascunho e removida respondem `undefined`. */
export async function findPhoto(photoId: string): Promise<StoredPhoto | undefined> {
  return (await getStore()).findPhoto(photoId);
}

/**
 * A mesma foto em qualquer estado, para o recibo de quem já comprou.
 * ⚠️ Nunca use numa tela pública — leia o contrato em `lib/model.ts`.
 */
export async function findSoldPhoto(photoId: string): Promise<StoredPhoto | undefined> {
  return (await getStore()).findSoldPhoto(photoId);
}

export async function photosByPhotographer(photographerId: string): Promise<StoredPhoto[]> {
  return (await getStore()).photosByPhotographer(photographerId);
}

export async function listCategories(): Promise<Category[]> {
  return (await getStore()).listCategories();
}

/* -------------------------------- autores -------------------------------- */

export async function findPhotographer(id: string): Promise<Photographer | undefined> {
  return (await getStore()).findPhotographer(id);
}

export async function listPhotographers(): Promise<Photographer[]> {
  return (await getStore()).listPhotographers();
}

/** O autor que a conta assina, ou `undefined` se ela não é de autor. */
export async function photographerOfUser(userId: string): Promise<Photographer | undefined> {
  return (await getStore()).photographerOfUser(userId);
}

/* ---------------------------- painel do autor ---------------------------- */

/**
 * Tudo do autor: rascunho, em análise e publicada. Removidas ficam de fora,
 * salvo `includeRemoved` — que a tela de vendas usa, porque venda não some
 * quando a foto sai do acervo.
 */
export async function photosOfAuthor(
  photographerId: string,
  options: { includeRemoved?: boolean } = {},
): Promise<StoredPhoto[]> {
  return (await getStore()).photosOfAuthor(photographerId, options);
}

/** Grava a foto enviada. O autor vem da sessão, nunca do corpo da requisição. */
export async function createPhoto(input: NewPhoto): Promise<StoredPhoto> {
  return (await getStore()).createPhoto(input);
}

/** Edita, já filtrado pelo autor. `undefined` = não é dele (trate como 404). */
export async function updatePhoto(
  photographerId: string,
  photoId: string,
  patch: PhotoPatch,
): Promise<StoredPhoto | undefined> {
  return (await getStore()).updatePhoto(photographerId, photoId, patch);
}

/** Tira do acervo sem apagar a linha — a licença de quem comprou é perpétua. */
export async function removePhoto(photographerId: string, photoId: string): Promise<boolean> {
  return (await getStore()).removePhoto(photographerId, photoId);
}
