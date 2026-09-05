import { randomBytes } from 'node:crypto';
import { hashPassword } from './password';
import { hashResetToken, newResetToken, RESET_TOKEN_TTL_MS } from './tokens';
import { seedPhotographers, seedPhotos, SEED_AUTOR_DA_ANA } from './seed-catalog';
import { slugify } from './slug';
import type {
  Category,
  CreateOrderResult,
  CreateUserResult,
  Order,
  Photographer,
  PhotoPatch,
  ResetCheck,
  Store,
  StoredPhoto,
  User,
} from './model';

interface ResetRecord {
  userId: string;
  tokenHash: string;
  expiresAt: number;
  usedAt?: number;
}

interface FotoNaMemoria extends StoredPhoto {
  removedAt?: number;
}

interface MemoryStore {
  users: User[];
  orders: Order[];

  photos: FotoNaMemoria[];
  photographers: Photographer[];
  resetTokens: Map<string, ResetRecord>;

  favorites: Map<string, Set<string>>;
}

const globalStore = globalThis as typeof globalThis & {
  __revelaMemoryStore?: MemoryStore;
};

const seedUsers: User[] = [
  {
    id: 'usr_ana',
    name: 'Ana Ribeiro',
    email: 'ana@revela.com',
    passwordHash: hashPassword('Revela@2026'),

    photographerId: SEED_AUTOR_DA_ANA,
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

const store: MemoryStore = (globalStore.__revelaMemoryStore ??= {
  users: seedUsers,
  orders: [],

  photos: seedPhotos.map((foto) => ({ ...foto })),
  photographers: seedPhotographers.map((autor) => ({ ...autor })),
  resetTokens: new Map(),
  favorites: new Map(),
});

export const memoryStore: Store = {
  async findUserByEmail(email) {
    const normalized = email.trim().toLowerCase();
    return store.users.find((u) => u.email === normalized);
  },

  async createUser(input): Promise<CreateUserResult> {
    const email = input.email.trim().toLowerCase();
    if (store.users.some((u) => u.email === email)) {
      return { ok: false, reason: 'EMAIL_TAKEN' };
    }

    const user: User = {
      id: `usr_${randomBytes(8).toString('hex')}`,
      name: input.name.trim(),
      email,
      passwordHash: hashPassword(input.password),
    };
    store.users.push(user);
    return { ok: true, user };
  },

  async updatePassword(userId, password) {
    const user = store.users.find((u) => u.id === userId);
    if (!user) return false;
    user.passwordHash = hashPassword(password);
    return true;
  },

  async createResetToken(userId) {
    const token = newResetToken();
    const tokenHash = hashResetToken(token);
    store.resetTokens.set(tokenHash, {
      userId,
      tokenHash,
      expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
    });
    return token;
  },

  async consumeResetToken(token): Promise<ResetCheck> {
    const record = store.resetTokens.get(hashResetToken(token));
    if (!record || record.usedAt) return { ok: false, reason: 'TOKEN_INVALID' };
    if (record.expiresAt < Date.now()) {
      return { ok: false, reason: 'TOKEN_EXPIRED' };
    }
    record.usedAt = Date.now();
    return { ok: true, userId: record.userId };
  },

  async createOrder(input): Promise<CreateOrderResult> {
    const existing = store.orders.find(
      (o) => o.userId === input.userId && o.photoId === input.photoId,
    );
    if (existing) return { order: existing, created: false };

    const order: Order = {
      id: `ord_${randomBytes(8).toString('hex')}`,
      createdAt: Date.now(),
      ...input,
    };
    store.orders.push(order);
    return { order, created: true };
  },

  async findOrder(userId, photoId) {
    return store.orders.find((o) => o.userId === userId && o.photoId === photoId);
  },

  async ordersByUser(userId) {
    return store.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async findOrderById(userId, orderId) {
    return store.orders.find((o) => o.id === orderId && o.userId === userId);
  },

  async ordersByAuthor(photographerId) {
    const fotos = new Set(
      store.photos.filter((f) => f.photographer.id === photographerId).map((f) => f.id),
    );
    return store.orders
      .filter((o) => fotos.has(o.photoId))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async salesByAuthor(photographerId) {
    const fotos = new Set(
      store.photos.filter((f) => f.photographer.id === photographerId).map((f) => f.id),
    );

    const porFoto: Record<string, { sales: number; revenue: number }> = {};
    for (const pedido of store.orders) {
      if (!fotos.has(pedido.photoId)) continue;
      const atual = (porFoto[pedido.photoId] ??= { sales: 0, revenue: 0 });
      atual.sales += 1;
      atual.revenue += pedido.pricePaid;
    }
    return porFoto;
  },

  async favoritesByUser(userId) {
    return [...(store.favorites.get(userId) ?? [])];
  },

  async isFavorited(userId, photoId) {
    return store.favorites.get(userId)?.has(photoId) ?? false;
  },

  async toggleFavorite(userId, photoId) {
    const atuais = store.favorites.get(userId) ?? new Set<string>();
    const favoritada = !atuais.has(photoId);

    if (favoritada) atuais.add(photoId);
    else atuais.delete(photoId);

    store.favorites.set(userId, atuais);
    return favoritada;
  },

  async listPhotos(options = {}) {
    return store.photos
      .filter(noAcervo)
      .filter((foto) => !options.category || foto.category === options.category)
      .sort(porRecencia)
      .map(publico);
  },

  async findPhoto(photoId) {
    const foto = store.photos.find((f) => f.id === photoId && noAcervo(f));
    return foto && publico(foto);
  },

  async findSoldPhoto(photoId) {
    const foto = store.photos.find((f) => f.id === photoId);
    return foto && publico(foto);
  },

  async photosByPhotographer(photographerId) {
    return store.photos
      .filter((foto) => foto.photographer.id === photographerId && noAcervo(foto))
      .sort(porRecencia)
      .map(publico);
  },

  async listCategories(): Promise<Category[]> {
    const porNome = new Map<string, { count: number; thumbnailUrl: string }>();

    for (const foto of [...store.photos].filter(noAcervo).sort((a, b) => a.id.localeCompare(b.id))) {
      const atual = porNome.get(foto.category);
      if (atual) atual.count += 1;

      else porNome.set(foto.category, { count: 1, thumbnailUrl: foto.thumbnailUrl });
    }

    return [...porNome.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], 'pt-BR'))
      .map(([name, { count, thumbnailUrl }], indice) => ({
        id: `c-${String(indice + 1).padStart(2, '0')}`,
        name,
        slug: slugify(name),
        photoCount: count,
        thumbnailUrl,
      }));
  },

  async findPhotographer(photographerId) {
    const autor = store.photographers.find((a) => a.id === photographerId);
    return autor ? comContagem(autor) : undefined;
  },

  async listPhotographers() {
    return store.photographers
      .map(comContagem)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  },

  async photographerOfUser(userId) {
    const user = store.users.find((u) => u.id === userId);
    if (!user?.photographerId) return undefined;
    const autor = store.photographers.find((a) => a.id === user.photographerId);
    return autor ? comContagem(autor) : undefined;
  },

  async createPhoto(input) {
    const autor = store.photographers.find((a) => a.id === input.photographerId);

    const foto: FotoNaMemoria = {
      id: `pho_${randomBytes(8).toString('hex')}`,
      title: input.title,
      photographer: { id: input.photographerId, name: autor?.name ?? '' },
      price: input.price,
      rating: 0,
      thumbnailUrl: input.thumbnailUrl,
      fullUrl: input.fullUrl,
      width: input.width,
      height: input.height,
      category: input.category,
      orientation: input.height > input.width ? 'vertical' : 'horizontal',
      status: 'publicada',
      createdAt: Date.now(),
      storageKey: input.storageKey,
    };

    store.photos.push(foto);
    return publico(foto);
  },

  async photosOfAuthor(photographerId, options = {}) {
    return store.photos
      .filter(
        (foto) =>
          foto.photographer.id === photographerId &&
          (options.includeRemoved || !foto.removedAt),
      )
      .sort(porRecencia)
      .map(publico);
  },

  async updatePhoto(photographerId, photoId, patch: PhotoPatch) {
    const foto = store.photos.find(
      (f) => f.id === photoId && f.photographer.id === photographerId && !f.removedAt,
    );
    if (!foto) return undefined;

    if (patch.title !== undefined) foto.title = patch.title;
    if (patch.category !== undefined) foto.category = patch.category;
    if (patch.price !== undefined) foto.price = patch.price;
    if (patch.status !== undefined) foto.status = patch.status;
    foto.updatedAt = Date.now();

    return publico(foto);
  },

  async removePhoto(photographerId, photoId) {
    const foto = store.photos.find(
      (f) => f.id === photoId && f.photographer.id === photographerId && !f.removedAt,
    );
    if (!foto) return false;

    foto.removedAt = Date.now();
    foto.updatedAt = Date.now();
    return true;
  },
};

function noAcervo(foto: FotoNaMemoria): boolean {
  return !foto.removedAt && foto.status === 'publicada';
}

function publico({ removedAt: _removida, ...foto }: FotoNaMemoria): StoredPhoto {
  return foto;
}

function porRecencia(a: StoredPhoto, b: StoredPhoto): number {
  return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
}

function comContagem(autor: Photographer): Photographer {
  return {
    ...autor,
    photoCount: store.photos.filter(
      (foto) => foto.photographer.id === autor.id && noAcervo(foto),
    ).length,
  };
}
