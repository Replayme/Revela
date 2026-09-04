import { randomBytes } from 'node:crypto';
import { at, execute, isUniqueViolation, money, query, queryOne } from './db';
import { hashPassword } from './password';
import { hashResetToken, newResetToken, RESET_TOKEN_TTL_MS } from './tokens';
import type {
  CreateOrderResult,
  CreateUserResult,
  Order,
  ResetCheck,
  Store,
  User,
} from './model';

/**
 * O armazenamento de verdade, em SQL Server.
 *
 * O esquema está em `db/001_schema.sql` — leia-o junto com este arquivo: boa
 * parte das garantias que aqui parecem ausentes está lá, como restrição de
 * tabela, que é onde elas de fato valem. Duas em especial:
 *
 *  - `UX_users_email` é o que impede duas contas com o mesmo e-mail. Não há
 *    "consultar antes de inserir" que resolva isso, porque entre a consulta e
 *    o INSERT cabe outra requisição. Aqui a gente insere e trata o erro 2627.
 *  - `UX_orders_user_photo` é o que faz a licença ser perpétua e única: pagar
 *    duas vezes pela mesma foto é impossível por construção, não por um `if`.
 *
 * Toda consulta é parametrizada (`@nome`). Nenhum valor vindo do cliente é
 * concatenado no texto do comando — ver `lib/db.ts`.
 */

/* ------------------------------ conversões ------------------------------- */

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  disabled: boolean;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    // O mock só carregava a chave quando era `true`, e o resto do código
    // testa por veracidade. Manter a mesma forma evita que algum `if` que
    // hoje funciona passe a ver `false` onde esperava `undefined`.
    ...(row.disabled ? { disabled: true } : {}),
  };
}

interface OrderRow {
  id: string;
  user_id: string;
  photo_id: string;
  price_paid: number;
  license_version: string;
  created_at: Date;
}

/**
 * DATETIME2 vira epoch em milissegundos.
 *
 * O site inteiro trata data como número desde o mock, e é o formato que a
 * resposta da API já documenta. Converter na fronteira do banco — e só aqui —
 * é o que mantém `docs/API.md` valendo sem mexer em nenhuma tela.
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

const USER_COLUMNS = 'id, name, email, password_hash, disabled';
const ORDER_COLUMNS =
  'id, user_id, photo_id, price_paid, license_version, created_at';

/* ------------------------------- o store --------------------------------- */

export const sqlServerStore: Store = {
  /**
   * O e-mail é normalizado em minúsculas antes de virar chave, do mesmo jeito
   * que na gravação. A coluna também tem `COLLATE Latin1_General_100_CI_AS`,
   * então o banco casaria "Ana@" com "ana@" de qualquer forma — mas depender
   * disso amarraria o código à collation do servidor, que muda de instalação
   * para instalação. Normalizar dos dois lados custa nada e não depende.
   */
  async findUserByEmail(email) {
    const row = await queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM dbo.users WHERE email = @email`,
      { email: email.trim().toLowerCase() },
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

    try {
      await execute(
        `INSERT INTO dbo.users (id, name, email, password_hash)
         VALUES (@id, @name, @email, @passwordHash)`,
        { ...user },
      );
    } catch (error) {
      // Único índice único da tabela é o do e-mail: se bateu, o e-mail é o
      // motivo. Deixar o erro subir daria 500 para quem só digitou um e-mail
      // que já existe.
      if (isUniqueViolation(error)) return { ok: false, reason: 'EMAIL_TAKEN' };
      throw error;
    }

    return { ok: true, user };
  },

  async updatePassword(userId, password) {
    const affected = await execute(
      `UPDATE dbo.users SET password_hash = @passwordHash WHERE id = @userId`,
      { userId, passwordHash: hashPassword(password) },
    );
    return affected > 0;
  },

  async createResetToken(userId) {
    const token = newResetToken();
    await execute(
      `INSERT INTO dbo.password_reset_tokens (token_hash, user_id, expires_at)
       VALUES (@tokenHash, @userId, @expiresAt)`,
      {
        tokenHash: hashResetToken(token),
        userId,
        expiresAt: at(Date.now() + RESET_TOKEN_TTL_MS),
      },
    );
    return token;
  },

  /**
   * Uso único, decidido pelo banco.
   *
   * O `UPDATE ... WHERE used_at IS NULL` é o ponto inteiro: quem conseguir
   * marcar a linha é quem usa o token, e uma segunda requisição com o mesmo
   * token não atualiza linha nenhuma. Ler, decidir e depois gravar deixaria
   * dois pedidos simultâneos redefinirem a senha com o mesmo link.
   *
   * A linha não é apagada — fica como registro de que aquele reset aconteceu.
   * A limpeza das vencidas é trabalho de rotina, não do caminho da requisição
   * (ver `db/001_schema.sql`).
   */
  async consumeResetToken(token): Promise<ResetCheck> {
    const tokenHash = hashResetToken(token);

    const claimed = await queryOne<{ user_id: string }>(
      `UPDATE dbo.password_reset_tokens
          SET used_at = SYSUTCDATETIME()
        OUTPUT inserted.user_id
        WHERE token_hash = @tokenHash
          AND used_at IS NULL
          AND expires_at > SYSUTCDATETIME()`,
      { tokenHash },
    );
    if (claimed) return { ok: true, userId: claimed.user_id };

    // Não deu: separar "não existe / já foi usado" de "venceu" só para a tela
    // poder oferecer um link novo em vez de dizer que o link é inválido.
    const row = await queryOne<{ used_at: Date | null }>(
      `SELECT used_at FROM dbo.password_reset_tokens WHERE token_hash = @tokenHash`,
      { tokenHash },
    );
    if (!row || row.used_at) return { ok: false, reason: 'TOKEN_INVALID' };
    return { ok: false, reason: 'TOKEN_EXPIRED' };
  },

  /**
   * `created: false` sai de duas situações que a rota trata igual: já havia
   * pedido, ou o índice único barrou uma segunda tentativa simultânea. Nos
   * dois casos o que se devolve é a licença que a pessoa tem — nunca uma nova.
   */
  async createOrder(input): Promise<CreateOrderResult> {
    const id = `ord_${randomBytes(8).toString('hex')}`;

    try {
      const inserted = await queryOne<{ created_at: Date }>(
        `INSERT INTO dbo.orders (id, user_id, photo_id, price_paid, license_version)
         OUTPUT inserted.created_at
         VALUES (@id, @userId, @photoId, @pricePaid, @licenseVersion)`,
        {
          id,
          userId: input.userId,
          photoId: input.photoId,
          pricePaid: money(input.pricePaid),
          licenseVersion: input.licenseVersion,
        },
      );

      return {
        order: { id, ...input, createdAt: inserted!.created_at.getTime() },
        created: true,
      };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;

      const existing = await sqlServerStore.findOrder(input.userId, input.photoId);
      // Se o índice barrou, a linha existe. Se sumiu entre uma coisa e outra,
      // alguém apagou o pedido no meio — não é caso de fingir sucesso.
      if (!existing) throw error;
      return { order: existing, created: false };
    }
  },

  async findOrder(userId, photoId) {
    const row = await queryOne<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM dbo.orders
        WHERE user_id = @userId AND photo_id = @photoId`,
      { userId, photoId },
    );
    return row ? toOrder(row) : undefined;
  },

  async ordersByUser(userId) {
    const rows = await query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM dbo.orders
        WHERE user_id = @userId
        ORDER BY created_at DESC`,
      { userId },
    );
    return rows.map(toOrder);
  },

  /** Já filtrado pelo dono, de propósito — ver a versão em memória. */
  async findOrderById(userId, orderId) {
    const row = await queryOne<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM dbo.orders
        WHERE id = @orderId AND user_id = @userId`,
      { userId, orderId },
    );
    return row ? toOrder(row) : undefined;
  },

  /**
   * **Não** filtrado pelo dono: quem pergunta é o autor da foto, que não é o
   * dono de nenhum destes pedidos. A conferência de que a foto é dele fica com
   * quem chama. Nunca devolva isto a um cliente sem essa conferência — a lista
   * diz quem comprou o quê.
   */
  async ordersByPhoto(photoId) {
    const rows = await query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM dbo.orders
        WHERE photo_id = @photoId
        ORDER BY created_at DESC`,
      { photoId },
    );
    return rows.map(toOrder);
  },

  async favoritesByUser(userId) {
    const rows = await query<{ photo_id: string }>(
      `SELECT photo_id FROM dbo.favorites
        WHERE user_id = @userId
        ORDER BY created_at DESC`,
      { userId },
    );
    return rows.map((row) => row.photo_id);
  },

  async isFavorited(userId, photoId) {
    const row = await queryOne<{ ok: number }>(
      `SELECT 1 AS ok FROM dbo.favorites
        WHERE user_id = @userId AND photo_id = @photoId`,
      { userId, photoId },
    );
    return row !== undefined;
  },

  /**
   * Alterna e devolve o estado que ficou.
   *
   * DELETE primeiro, INSERT só se não apagou nada: o `@@ROWCOUNT` responde
   * "estava lá?" sem uma consulta separada, e assim não existe a janela entre
   * ler e escrever em que dois cliques do mesmo usuário se anulam.
   */
  async toggleFavorite(userId, photoId) {
    try {
      const row = await queryOne<{ favorited: boolean }>(
        `DELETE FROM dbo.favorites WHERE user_id = @userId AND photo_id = @photoId;
         IF @@ROWCOUNT = 0
         BEGIN
           INSERT INTO dbo.favorites (user_id, photo_id) VALUES (@userId, @photoId);
           SELECT CAST(1 AS BIT) AS favorited;
         END
         ELSE
           SELECT CAST(0 AS BIT) AS favorited;`,
        { userId, photoId },
      );
      return row?.favorited ?? false;
    } catch (error) {
      // Dois cliques simultâneos: um inseriu, o outro bateu na chave primária.
      // O estado final é "favoritada", que é o que os dois queriam.
      if (isUniqueViolation(error)) return true;
      throw error;
    }
  },
};
