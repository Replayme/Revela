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

let cached: Store | undefined;

async function getStore(): Promise<Store> {
  if (cached) return cached;

  if (!isDatabaseConfigured()) {
    if (process.env.NODE_ENV === 'production') {

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

export async function createResetToken(userId: string): Promise<string> {
  return (await getStore()).createResetToken(userId);
}

export async function consumeResetToken(token: string): Promise<ResetCheck> {
  return (await getStore()).consumeResetToken(token);
}

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

export async function ordersByAuthor(photographerId: string): Promise<Order[]> {
  return (await getStore()).ordersByAuthor(photographerId);
}

export async function salesByAuthor(
  photographerId: string,
): Promise<Record<string, { sales: number; revenue: number }>> {
  return (await getStore()).salesByAuthor(photographerId);
}

export async function favoritesByUser(userId: string): Promise<string[]> {
  return (await getStore()).favoritesByUser(userId);
}

export async function isFavorited(
  userId: string,
  photoId: string,
): Promise<boolean> {
  return (await getStore()).isFavorited(userId, photoId);
}

export async function toggleFavorite(
  userId: string,
  photoId: string,
): Promise<boolean> {
  return (await getStore()).toggleFavorite(userId, photoId);
}

export async function listPhotos(options: { category?: string } = {}): Promise<StoredPhoto[]> {
  return (await getStore()).listPhotos(options);
}

export async function findPhoto(photoId: string): Promise<StoredPhoto | undefined> {
  return (await getStore()).findPhoto(photoId);
}

export async function findSoldPhoto(photoId: string): Promise<StoredPhoto | undefined> {
  return (await getStore()).findSoldPhoto(photoId);
}

export async function photosByPhotographer(photographerId: string): Promise<StoredPhoto[]> {
  return (await getStore()).photosByPhotographer(photographerId);
}

export async function listCategories(): Promise<Category[]> {
  return (await getStore()).listCategories();
}

export async function findPhotographer(id: string): Promise<Photographer | undefined> {
  return (await getStore()).findPhotographer(id);
}

export async function listPhotographers(): Promise<Photographer[]> {
  return (await getStore()).listPhotographers();
}

export async function photographerOfUser(userId: string): Promise<Photographer | undefined> {
  return (await getStore()).photographerOfUser(userId);
}

export async function photosOfAuthor(
  photographerId: string,
  options: { includeRemoved?: boolean } = {},
): Promise<StoredPhoto[]> {
  return (await getStore()).photosOfAuthor(photographerId, options);
}

export async function createPhoto(input: NewPhoto): Promise<StoredPhoto> {
  return (await getStore()).createPhoto(input);
}

export async function updatePhoto(
  photographerId: string,
  photoId: string,
  patch: PhotoPatch,
): Promise<StoredPhoto | undefined> {
  return (await getStore()).updatePhoto(photographerId, photoId, patch);
}

export async function removePhoto(photographerId: string, photoId: string): Promise<boolean> {
  return (await getStore()).removePhoto(photographerId, photoId);
}
