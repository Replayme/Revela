import { randomBytes } from 'node:crypto';
import { query, queryOne } from './db';
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

const USER_COLUMNS = 'id, name, email, password_hash, disabled';
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
   * **Não** filtrado pelo dono, e não é descuido: quem pergunta é o autor da
   * foto, que não é o dono de nenhum destes pedidos. A conferência de que a
   * foto é dele fica com quem chama, porque é lá que existe o vínculo entre
   * conta e autor.
   *
   * Nunca devolva isto a um cliente sem essa conferência: a lista diz quem
   * comprou o quê.
   */
  async ordersByPhoto(photoId) {
    const rows = await query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders
        WHERE photo_id = $1
        ORDER BY created_at DESC`,
      [photoId],
    );
    return rows.map(toOrder);
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
};
