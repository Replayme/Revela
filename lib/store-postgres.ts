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

/**
 * O armazenamento de verdade, em Postgres (Neon).
 *
 * O esquema está em `db/001_schema.sql` — leia-o junto com este arquivo: boa
 * parte das garantias que aqui parecem ausentes está lá, como restrição de
 * tabela, que é onde elas de fato valem. Duas em especial:
 *
 *  - `users_email_key` é o que impede duas contas com o mesmo e-mail. Não há
 *    "consultar antes de inserir" que resolva isso, porque entre a consulta e
 *    o INSERT cabe outra requisição. Aqui a gente insere com
 *    `ON CONFLICT DO NOTHING` e lê o resultado.
 *  - `orders_user_photo_key` é o que faz a licença ser perpétua e única:
 *    pagar duas vezes pela mesma foto é impossível por construção, não por um
 *    `if`.
 *
 * `ON CONFLICT DO NOTHING ... RETURNING` aparece muito por aqui, e é o mesmo
 * padrão sempre: **o banco decide, e a linha devolvida (ou a ausência dela)
 * conta o que aconteceu.** Sem `try/catch` para separar "deu certo" de "já
 * existia", que é o jeito de um dia engolir um erro que não era esse.
 *
 * Toda consulta é parametrizada (`$1`, `$2`…). Nenhum valor vindo do cliente
 * é concatenado no texto do comando — ver `lib/db.ts`.
 */

/* ------------------------------ conversões ------------------------------- */

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
    // O store em memória só carrega a chave quando é `true`, e o resto do
    // código testa por veracidade. Manter a mesma forma evita que algum `if`
    // que hoje funciona passe a ver `false` onde esperava `undefined`.
    ...(row.disabled ? { disabled: true } : {}),
    ...(row.photographer_id ? { photographerId: row.photographer_id } : {}),
  };
}

interface OrderRow {
  id: string;
  user_id: string;
  photo_id: string;
  /** `NUMERIC` chega como string — ver `toOrder`. */
  price_paid: string;
  license_version: string;
  created_at: Date;
}

/**
 * Duas conversões na fronteira do banco, e só aqui:
 *
 *  - `NUMERIC` chega do Postgres como **string**, de propósito: o driver não
 *    converte para `number` sozinho porque `double` não representa todo
 *    decimal, e é assim que se perde centavo sem ninguém ver. Convertemos no
 *    limite, sabendo que o preço de uma foto cabe folgado num `number`.
 *  - `TIMESTAMPTZ` vira epoch em milissegundos. O site inteiro trata data como
 *    número desde o mock, e é o formato que a resposta da API já documenta;
 *    converter aqui é o que mantém `docs/API.md` valendo sem mexer em nenhuma
 *    tela.
 */
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
    // Derivada, nunca guardada — ver `Photo.orientation` em `lib/model.ts`.
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

/**
 * As colunas da foto mais o nome de quem assina.
 *
 * O JOIN existe porque `Photo.photographer` é `{ id, name }` — a ficha mostra
 * o nome, não o slug. Trazer só o id obrigaria cada tela a buscar o autor
 * depois, uma consulta por foto, para escrever uma linha de legenda.
 */
const PHOTO_SELECT = `
  SELECT f.id, f.photographer_id, a.name AS photographer_name, f.title,
         f.category, f.price, f.rating, f.status, f.width, f.height,
         f.thumbnail_url, f.full_url, f.created_at, f.updated_at
    FROM photos f
    JOIN photographers a ON a.id = f.photographer_id`;

/** No acervo: publicada e não removida. É a definição de "existe para quem visita". */
const NO_ACERVO = `f.removed_at IS NULL AND f.status = 'publicada'`;

/**
 * Mais recente primeiro; o id desempata.
 *
 * O acervo de demonstração entra todo num INSERT só, então as catorze fotos
 * têm o mesmo `created_at` — sem o desempate a home embaralharia a cada
 * consulta, e "por que a ordem muda sozinha?" é um bug caro de achar.
 */
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

/* ------------------------------- o store --------------------------------- */

export const postgresStore: Store = {
  /**
   * O e-mail é normalizado em minúsculas antes de virar chave, do mesmo jeito
   * que na gravação. Postgres compara texto respeitando maiúsculas, então sem
   * essa normalização dos dois lados "Ana@Revela.com" abriria uma segunda
   * conta e ninguém mais entraria em nenhuma das duas com certeza.
   */
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

    // Nenhuma linha devolvida: o único índice único da tabela é o do e-mail,
    // então o e-mail é o motivo.
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

  /** Devolve o valor bruto — só ele vai no e-mail; o banco guarda o hash. */
  async createResetToken(userId) {
    const token = newResetToken();
    await query(
      `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [hashResetToken(token), userId, new Date(Date.now() + RESET_TOKEN_TTL_MS)],
    );
    return token;
  },

  /**
   * Uso único, decidido pelo banco.
   *
   * O `WHERE used_at IS NULL` do UPDATE é o ponto inteiro: quem conseguir
   * marcar a linha é quem usa o token, e uma segunda requisição com o mesmo
   * token não atualiza linha nenhuma. Ler, decidir e depois gravar deixaria
   * dois pedidos simultâneos redefinirem a senha com o mesmo link.
   *
   * O `SELECT` ao lado do CTE separa "venceu" de "não existe / já foi usado",
   * para a tela poder oferecer um link novo em vez de dizer que o link é
   * inválido. Ele enxerga a linha **como estava antes** do UPDATE — as duas
   * partes da consulta veem o mesmo instantâneo —, que é exatamente o que se
   * quer: se o token era utilizável, `usuario` vem preenchido; se estava
   * vencido, `vencido` vem verdadeiro.
   *
   * A linha não é apagada — fica como registro de que aquele reset aconteceu.
   * A limpeza das vencidas é trabalho de rotina, não do caminho da requisição
   * (ver `db/001_schema.sql`).
   */
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

  /**
   * `created: false` quer dizer que a pessoa já tinha essa foto e o pedido
   * devolvido é o antigo — inclusive quando a corrida acontece entre a
   * consulta de quem chamou e este INSERT. Quem decide é o índice único de
   * (usuário, foto), não a consulta.
   */
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
    // Se o índice barrou, a linha existe. Se sumiu entre uma coisa e outra,
    // alguém apagou o pedido no meio — não é caso de fingir sucesso.
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

  /**
   * Do mais recente para o mais antigo — é a ordem em que o painel lista as
   * licenças.
   */
  async ordersByUser(userId) {
    const rows = await query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map(toOrder);
  },

  /**
   * Um pedido pelo id, **já filtrado pelo dono**. A busca recebe o usuário de
   * propósito: um `findById` puro deixaria a checagem de dono a cargo de quem
   * chama, e é assim que um dia alguém lê o recibo de outra pessoa trocando o
   * id na URL.
   */
  async findOrderById(userId, orderId) {
    const row = await queryOne<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $2 AND user_id = $1`,
      [userId, orderId],
    );
    return row ? toOrder(row) : undefined;
  },

  /**
   * A junção é do banco: uma consulta para o painel inteiro, no lugar de uma
   * por foto do acervo do autor.
   *
   * O `user_id` vem junto porque é coluna de `orders` — mas a tela de vendas
   * não o mostra. Ver o contrato em `lib/model.ts`.
   */
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

  /**
   * Alterna e devolve o estado que ficou, num comando só.
   *
   * Apaga; se não apagou nada, insere. O `NOT EXISTS (SELECT 1 FROM removido)`
   * não é só a condição — é o que **ordena** as duas partes: um CTE que lê
   * outro roda depois dele. Sem esse vínculo os dois veriam o mesmo
   * instantâneo e rodariam em paralelo, apagando e inserindo a mesma linha.
   *
   * Feito em duas consultas (ler e depois escrever), dois cliques rápidos no
   * mesmo coração se anulariam. Aqui não há janela entre uma coisa e outra.
   */
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

  /* ------------------------- acervo — leitura pública --------------------- */

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

  /** Sem filtro de estado — é o ponto. Ver o contrato em `lib/model.ts`. */
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

  /**
   * As categorias saem de um `GROUP BY` sobre o acervo, não de uma lista
   * escrita à mão.
   *
   * Antes a lista era fixa e trazia outro vocabulário — Natureza, Negócios,
   * Viagens — que não batia com nenhuma categoria das fotos, e o cartão da home
   * levava para uma busca sem resultado. Derivar da fonte é o que garante que
   * todo filtro oferecido tem o que mostrar.
   *
   * A capa é a primeira foto da categoria: o cartão mostra o acervo que
   * promete, não uma imagem avulsa.
   */
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

    // A ordenação fica aqui, e não no SQL, porque `localeCompare('pt-BR')`
    // ordena acento como leitor brasileiro espera e a collation do servidor
    // não é garantida — o mesmo banco em outra instalação mudaria a home.
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

  /* -------------------------------- autores -------------------------------- */

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

  /**
   * O que substituiu o `VINCULO_DEMO`: uma junção, não um mapa escrito à mão.
   * Conta sem `photographer_id` — que é a maioria, quem só compra — devolve
   * `undefined`, e o painel mostra o caminho para o cadastro de fotógrafo.
   */
  async photographerOfUser(userId) {
    const row = await queryOne<PhotographerRow>(
      `${PHOTOGRAPHER_SELECT}
         JOIN users u ON u.photographer_id = a.id
        WHERE u.id = $1`,
      [userId],
    );
    return row ? toPhotographer(row) : undefined;
  },

  /* --------------------------- painel — escrita ---------------------------- */

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

  /**
   * O `photographer_id` no `WHERE` é a autorização, e não um `if` antes da
   * chamada: buscar a foto, comparar o dono e só então gravar deixa uma janela
   * entre a comparação e o UPDATE — e é o caminho que um dia esquece de
   * comparar. Foto de outra pessoa não atualiza linha nenhuma e devolve
   * `undefined`.
   *
   * `COALESCE` por campo é o que faz o PATCH ser parcial de verdade: o que não
   * veio no corpo continua como está, em vez de virar nulo. Os `::` são
   * necessários — um parâmetro nulo sem tipo declarado dentro de `COALESCE`
   * não tem como ser inferido pelo servidor.
   */
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

  /**
   * Remover é gravar `removed_at`, não apagar a linha.
   *
   * A licença é perpétua: o recibo de quem comprou tem de continuar resolvendo
   * depois que o autor tira a foto de venda. Um DELETE de verdade ou seria
   * recusado pela chave estrangeira de `orders`, ou — com CASCADE — apagaria a
   * venda junto, que é registro financeiro. Ver `db/003_catalogo.sql`.
   */
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
