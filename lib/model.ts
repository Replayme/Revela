export interface User {
  id: string;
  name: string;
  email: string;

  passwordHash: string;
  disabled?: boolean;

  photographerId?: string;
}

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'EMAIL_TAKEN' };

export type ResetCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' };

export interface Order {
  id: string;
  userId: string;
  photoId: string;

  pricePaid: number;

  licenseVersion: string;

  createdAt: number;
}

export interface CreateOrderResult {
  order: Order;
  created: boolean;
}

export interface Photo {
  id: string;
  title: string;
  photographer: { id: string; name: string };
  price: number;
  rating: number;
  thumbnailUrl: string;

  fullUrl: string;

  width: number;
  height: number;
  category: string;

  orientation: 'horizontal' | 'vertical';
}

export type PhotoStatus = 'rascunho' | 'em-analise' | 'publicada';

export interface StoredPhoto extends Photo {
  status: PhotoStatus;
  createdAt: number;
  updatedAt?: number;
  storageKey?: string;
}

export interface NewPhoto {
  photographerId: string;
  title: string;
  category: string;
  price: number;
  width: number;
  height: number;
  thumbnailUrl: string;
  fullUrl: string;
  storageKey: string;
}

export interface PhotoPatch {
  title?: string;
  category?: string;
  price?: number;
  status?: PhotoStatus;
}

export interface Photographer {
  id: string;
  name: string;
  avatarUrl: string;
  coverPhotoUrl: string;

  photoCount: number;
  rating: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  photoCount: number;
  thumbnailUrl: string;
}

export interface Store {

  findUserByEmail(email: string): Promise<User | undefined>;
  createUser(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<CreateUserResult>;
  updatePassword(userId: string, password: string): Promise<boolean>;

  createResetToken(userId: string): Promise<string>;
  consumeResetToken(token: string): Promise<ResetCheck>;

  createOrder(input: {
    userId: string;
    photoId: string;
    pricePaid: number;
    licenseVersion: string;
  }): Promise<CreateOrderResult>;
  findOrder(userId: string, photoId: string): Promise<Order | undefined>;
  ordersByUser(userId: string): Promise<Order[]>;
  findOrderById(userId: string, orderId: string): Promise<Order | undefined>;

  ordersByAuthor(photographerId: string): Promise<Order[]>;

  salesByAuthor(
    photographerId: string,
  ): Promise<Record<string, { sales: number; revenue: number }>>;

  favoritesByUser(userId: string): Promise<string[]>;
  isFavorited(userId: string, photoId: string): Promise<boolean>;
  toggleFavorite(userId: string, photoId: string): Promise<boolean>;

  listPhotos(options?: { category?: string }): Promise<StoredPhoto[]>;

  findPhoto(photoId: string): Promise<StoredPhoto | undefined>;

  findSoldPhoto(photoId: string): Promise<StoredPhoto | undefined>;

  photosByPhotographer(photographerId: string): Promise<StoredPhoto[]>;

  listCategories(): Promise<Category[]>;

  findPhotographer(photographerId: string): Promise<Photographer | undefined>;
  listPhotographers(): Promise<Photographer[]>;

  photographerOfUser(userId: string): Promise<Photographer | undefined>;

  createPhoto(input: NewPhoto): Promise<StoredPhoto>;

  photosOfAuthor(
    photographerId: string,
    options?: {

      includeRemoved?: boolean;
    },
  ): Promise<StoredPhoto[]>;

  updatePhoto(
    photographerId: string,
    photoId: string,
    patch: PhotoPatch,
  ): Promise<StoredPhoto | undefined>;

  removePhoto(photographerId: string, photoId: string): Promise<boolean>;
}
