import { randomBytes } from 'node:crypto';
import { query, queryOne } from './db';
import { hashPassword } from './password';
import { hashResetToken, newResetToken, RESET_TOKEN_TTL_MS } from './tokens';
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

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  disabled: boolean;
  photographer_id: string | null;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,

    ...(row.disabled ? { disabled: true } : {}),
    ...(row.photographer_id ? { photographerId: row.photographer_id } : {}),
  };
}

interface OrderRow {
  id: string;
  user_id: string;
  photo_id: string;

  price_paid: string;
  license_version: string;
  created_at: Date;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    photoId: row.photo_id,
    pricePaid: Number(row.price_paid),
    licenseVersion: row.license_version,
    createdAt: row.created_at.getTime(),
  };
}

interface PhotoRow {
  id: string;
  photographer_id: string;
  photographer_name: string;
  title: string;
  category: string;
  price: string;
  rating: string;
  status: string;
  width: number;
  height: number;
  thumbnail_url: string;
  full_url: string;
  created_at: Date;
  updated_at: Date | null;
}

function toPhoto(row: PhotoRow): StoredPhoto {
  return {
    id: row.id,
    title: row.title,
    photographer: { id: row.photographer_id, name: row.photographer_name },
    price: Number(row.price),
    rating: Number(row.rating),
    thumbnailUrl: row.thumbnail_url,
    fullUrl: row.full_url,
    width: row.width,
    height: row.height,
    category: row.category,

    orientation: row.height > row.width ? 'vertical' : 'horizontal',
    status: row.status as StoredPhoto['status'],
    createdAt: row.created_at.getTime(),
    ...(row.updated_at ? { updatedAt: row.updated_at.getTime() } : {}),
  };
}

interface PhotographerRow {
  id: string;
  name: string;
  avatar_url: string;
  cover_photo_url: string;
  rating: string;
  photo_count: number;
}

function toPhotographer(row: PhotographerRow): Photographer {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    coverPhotoUrl: row.cover_photo_url,
    rating: Number(row.rating),
    photoCount: row.photo_count,
  };
}

const PHOTO_SELECT = `
  SELECT f.id, f.photographer_id, a.name AS photographer_name, f.title,
         f.category, f.price, f.rating, f.status, f.width, f.height,
         f.thumbnail_url, f.full_url, f.created_at, f.updated_at
    FROM photos f
    JOIN photographers a ON a.id = f.photographer_id`;

const NO_ACERVO = `f.removed_at IS NULL AND f.status = 'publicada'`;

const ORDEM = `ORDER BY f.created_at DESC, f.id ASC`;

const PHOTOGRAPHER_SELECT = `
  SELECT a.id, a.name, a.avatar_url, a.cover_photo_url, a.rating,
         (SELECT count(*)::int FROM photos f
           WHERE f.photographer_id = a.id
             AND f.removed_at IS NULL AND f.status = 'publicada') AS photo_count
    FROM photographers a`;

const USER_COLUMNS = 'id, name, email, password_hash, disabled, photographer_id';
const ORDER_COLUMNS =
  'id, user_id, photo_id, price_paid, license_version, created_at';

export const postgresStore: Store = {

  async findUserByEmail(email) {
    const row = await queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
      [email.trim().toLowerCase()],
    );
    return row ? toUser(row) : undefined;
  },

  async createUser(input): Promise<CreateUserResult> {
    const user: User = {
      id: `usr_${randomBytes(8).toString('hex')}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash: hashPassword(input.password),
    };

    const inserido = await queryOne<{ id: string }>(
      `INSERT INTO users (id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [user.id, user.name, user.email, user.passwordHash],
    );

    if (!inserido) return { ok: false, reason: 'EMAIL_TAKEN' };
    return { ok: true, user };
  },

  async updatePassword(userId, password) {
    const linhas = await query(
      `UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id`,
      [userId, hashPassword(password)],
    );
    return linhas.length > 0;
  },

  async createResetToken(userId) {
    const token = newResetToken();
    await query(
      `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [hashResetToken(token), userId, new Date(Date.now() + RESET_TOKEN_TTL_MS)],
    );
    return token;
  },

  async consumeResetToken(token): Promise<ResetCheck> {
    const resultado = await queryOne<{
      usuario: string | null;
      vencido: boolean;
    }>(
      `WITH usado AS (
         UPDATE password_reset_tokens
            SET used_at = now()
          WHERE token_hash = $1
            AND used_at IS NULL
            AND expires_at > now()
        RETURNING user_id
       )
       SELECT
         (SELECT user_id FROM usado) AS usuario,
         EXISTS (
           SELECT 1 FROM password_reset_tokens
            WHERE token_hash = $1 AND used_at IS NULL AND expires_at <= now()
         ) AS vencido`,
      [hashResetToken(token)],
    );

    if (resultado?.usuario) return { ok: true, userId: resultado.usuario };
    if (resultado?.vencido) return { ok: false, reason: 'TOKEN_EXPIRED' };
    return { ok: false, reason: 'TOKEN_INVALID' };
  },

  async createOrder(input): Promise<CreateOrderResult> {
    const id = `ord_${randomBytes(8).toString('hex')}`;

    const inserido = await queryOne<{ created_at: Date }>(
      `INSERT INTO orders (id, user_id, photo_id, price_paid, license_version)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, photo_id) DO NOTHING
       RETURNING created_at`,
      [id, input.userId, input.photoId, input.pricePaid, input.licenseVersion],
    );

    if (inserido) {
      return {
        order: { id, ...input, createdAt: inserido.created_at.getTime() },
        created: true,
      };
    }

    const existente = await postgresStore.findOrder(input.userId, input.photoId);

    if (!existente) {
      throw new Error(
        `pedido de ${input.userId} para ${input.photoId} não foi inserido nem encontrado`,
      );
    }
    return { order: existente, created: false };
  },

  async findOrder(userId, photoId) {
    const row = await queryOne<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE user_id = $1 AND photo_id = $2`,
      [userId, photoId],
    );
    return row ? toOrder(row) : undefined;
  },

  async ordersByUser(userId) {
    const rows = await query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(toOrder);
  },

  async findOrderById(userId, orderId) {
    const row = await queryOne<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $2 AND user_id = $1`,
      [userId, orderId],
    );
    return row ? toOrder(row) : undefined;
  },

  async ordersByAuthor(photographerId) {
    const rows = await query<OrderRow>(
      `SELECT ${ORDER_COLUMNS.split(', ').map((c) => `o.${c}`).join(', ')}
         FROM orders o
         JOIN photos f ON f.id = o.photo_id
        WHERE f.photographer_id = $1
        ORDER BY o.created_at DESC`,
      [photographerId],
    );
    return rows.map(toOrder);
  },

  async salesByAuthor(photographerId) {
    const rows = await query<{ photo_id: string; sales: number; revenue: string }>(
      `SELECT o.photo_id,
              count(*)::int AS sales,
              COALESCE(sum(o.price_paid), 0) AS revenue
         FROM orders o
         JOIN photos f ON f.id = o.photo_id
        WHERE f.photographer_id = $1
        GROUP BY o.photo_id`,
      [photographerId],
    );

    return Object.fromEntries(
      rows.map((row) => [row.photo_id, { sales: row.sales, revenue: Number(row.revenue) }]),
    );
  },

  async favoritesByUser(userId) {
    const rows = await query<{ photo_id: string }>(
      `SELECT photo_id FROM favorites
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((row) => row.photo_id);
  },

  async isFavorited(userId, photoId) {
    const row = await queryOne(
      `SELECT 1 FROM favorites WHERE user_id = $1 AND photo_id = $2`,
      [userId, photoId],
    );
    return row !== undefined;
  },

  async toggleFavorite(userId, photoId) {
    const row = await queryOne<{ favorited: boolean }>(
      `WITH removido AS (
         DELETE FROM favorites WHERE user_id = $1 AND photo_id = $2
         RETURNING 1
       ), inserido AS (
         INSERT INTO favorites (user_id, photo_id)
         SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM removido)
         ON CONFLICT DO NOTHING
         RETURNING 1
       )
       SELECT EXISTS (SELECT 1 FROM inserido) AS favorited`,
      [userId, photoId],
    );
    return row?.favorited ?? false;
  },

  async listPhotos(options = {}) {
    const rows = await query<PhotoRow>(
      `${PHOTO_SELECT}
        WHERE ${NO_ACERVO}
          AND ($1::text IS NULL OR f.category = $1)
        ${ORDEM}`,
      [options.category ?? null],
    );
    return rows.map(toPhoto);
  },

  async findPhoto(photoId) {
    const row = await queryOne<PhotoRow>(
      `${PHOTO_SELECT} WHERE f.id = $1 AND ${NO_ACERVO}`,
      [photoId],
    );
    return row ? toPhoto(row) : undefined;
  },

  async findSoldPhoto(photoId) {
    const row = await queryOne<PhotoRow>(`${PHOTO_SELECT} WHERE f.id = $1`, [photoId]);
    return row ? toPhoto(row) : undefined;
  },

  async photosByPhotographer(photographerId) {
    const rows = await query<PhotoRow>(
      `${PHOTO_SELECT} WHERE f.photographer_id = $1 AND ${NO_ACERVO} ${ORDEM}`,
      [photographerId],
    );
    return rows.map(toPhoto);
  },

  async listCategories(): Promise<Category[]> {
    const rows = await query<{
      name: string;
      photo_count: number;
      thumbnail_url: string;
    }>(
      `SELECT f.category AS name,
              count(*)::int AS photo_count,
              (array_agg(f.thumbnail_url ORDER BY f.id))[1] AS thumbnail_url
         FROM photos f
        WHERE f.removed_at IS NULL AND f.status = 'publicada'
        GROUP BY f.category`,
    );

    return rows
      .sort((a, b) => b.photo_count - a.photo_count || a.name.localeCompare(b.name, 'pt-BR'))
      .map((row, indice) => ({
        id: `c-${String(indice + 1).padStart(2, '0')}`,
        name: row.name,
        slug: slugify(row.name),
        photoCount: row.photo_count,
        thumbnailUrl: row.thumbnail_url,
      }));
  },

  async findPhotographer(photographerId) {
    const row = await queryOne<PhotographerRow>(
      `${PHOTOGRAPHER_SELECT} WHERE a.id = $1`,
      [photographerId],
    );
    return row ? toPhotographer(row) : undefined;
  },

  async listPhotographers() {
    const rows = await query<PhotographerRow>(
      `${PHOTOGRAPHER_SELECT} ORDER BY a.name`,
    );
    return rows.map(toPhotographer);
  },

  async photographerOfUser(userId) {
    const row = await queryOne<PhotographerRow>(
      `${PHOTOGRAPHER_SELECT}
         JOIN users u ON u.photographer_id = a.id
        WHERE u.id = $1`,
      [userId],
    );
    return row ? toPhotographer(row) : undefined;
  },

  async createPhoto(input) {
    const id = `pho_${randomBytes(8).toString('hex')}`;

    const row = await queryOne<PhotoRow>(
      `WITH nova AS (
         INSERT INTO photos
           (id, photographer_id, title, category, price, width, height,
            thumbnail_url, full_url, storage_key, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'publicada')
         RETURNING *
       )
       SELECT f.id, f.photographer_id, a.name AS photographer_name, f.title,
              f.category, f.price, f.rating, f.status, f.width, f.height,
              f.thumbnail_url, f.full_url, f.created_at, f.updated_at
         FROM nova f
         JOIN photographers a ON a.id = f.photographer_id`,
      [
        id,
        input.photographerId,
        input.title,
        input.category,
        input.price,
        input.width,
        input.height,
        input.thumbnailUrl,
        input.fullUrl,
        input.storageKey,
      ],
    );

    return toPhoto(row!);
  },

  async photosOfAuthor(photographerId, options = {}) {
    const rows = await query<PhotoRow>(
      `${PHOTO_SELECT}
        WHERE f.photographer_id = $1
          AND ($2::boolean OR f.removed_at IS NULL)
        ${ORDEM}`,
      [photographerId, options.includeRemoved ?? false],
    );
    return rows.map(toPhoto);
  },

  async updatePhoto(photographerId, photoId, patch: PhotoPatch) {
    const row = await queryOne<PhotoRow>(
      `WITH atualizada AS (
         UPDATE photos SET
             title      = COALESCE($3::text, title),
             category   = COALESCE($4::text, category),
             price      = COALESCE($5::numeric, price),
             status     = COALESCE($6::text, status),
             updated_at = now()
          WHERE id = $2 AND photographer_id = $1 AND removed_at IS NULL
         RETURNING *
       )
       SELECT f.id, f.photographer_id, a.name AS photographer_name, f.title,
              f.category, f.price, f.rating, f.status, f.width, f.height,
              f.thumbnail_url, f.full_url, f.created_at, f.updated_at
         FROM atualizada f
         JOIN photographers a ON a.id = f.photographer_id`,
      [
        photographerId,
        photoId,
        patch.title ?? null,
        patch.category ?? null,
        patch.price ?? null,
        patch.status ?? null,
      ],
    );
    return row ? toPhoto(row) : undefined;
  },

  async removePhoto(photographerId, photoId) {
    const linhas = await query(
      `UPDATE photos SET removed_at = now(), updated_at = now()
        WHERE id = $2 AND photographer_id = $1 AND removed_at IS NULL
       RETURNING id`,
      [photographerId, photoId],
    );
    return linhas.length > 0;
  },
};
