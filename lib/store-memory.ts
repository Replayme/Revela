import { randomBytes } from 'node:crypto';
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
 * "Banco" em memória — SOMENTE PARA DESENVOLVIMENTO E DEMONSTRAÇÃO.
 * Some a cada restart do servidor.
 *
 * Continua aqui, depois do banco existir, por um motivo prático: quem
 * clona o repositório para mexer numa tela roda `npm run dev` e o site
 * funciona, com contas de demonstração e tudo, sem provisionar banco nenhum.
 * O `lib/repository.ts` escolhe um dos dois pela configuração.
 *
 * Não use em produção, e não é só pelo restart: em serverless cada instância
 * tem a sua memória, então duas requisições seguidas podem cair em processos
 * diferentes e discordar sobre o que existe. O cadastro feito numa instância
 * simplesmente não existe na outra.
 */

interface ResetRecord {
  userId: string;
  tokenHash: string;
  expiresAt: number;
  usedAt?: number;
}

interface MemoryStore {
  users: User[];
  orders: Order[];
  resetTokens: Map<string, ResetRecord>;
  /** Favoritos por usuário: id do usuário → ids das fotos. */
  favorites: Map<string, Set<string>>;
}

/**
 * Estado mutável guardado no `globalThis`.
 *
 * Rotas de API e componentes de servidor são empacotados separadamente: cada
 * bundle carrega a sua cópia deste módulo, com o seu próprio array. Sem um
 * ponto comum, a compra registrada pela rota some quando a página vai ler —
 * foi exatamente o que aconteceu no teste. `globalThis` é o mesmo objeto para
 * todos os bundles do processo. O cliente do Postgres usa o mesmo truque, pelo
 * mesmo motivo (ver `lib/db.ts`).
 */
const globalStore = globalThis as typeof globalThis & {
  __revelaMemoryStore?: MemoryStore;
};

// Contas de demonstração. A senha nasce hasheada aqui como nasceria no banco.
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

const store: MemoryStore = (globalStore.__revelaMemoryStore ??= {
  users: seedUsers,
  orders: [],
  resetTokens: new Map(),
  favorites: new Map(),
});

export const memoryStore: Store = {
  async findUserByEmail(email) {
    const normalized = email.trim().toLowerCase();
    return store.users.find((u) => u.email === normalized);
  },

  /**
   * O e-mail é normalizado antes de virar chave: sem isso "Ana@Revela.com"
   * abriria uma segunda conta e ninguém mais conseguiria entrar em nenhuma das
   * duas com certeza.
   *
   * A verificação de unicidade abaixo é o que dá para fazer com um array —
   * entre o `find` e o `push` cabe outra requisição. No Postgres quem garante
   * é a restrição de unicidade, que é o jeito certo; ver `store-postgres.ts`.
   */
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

  /** Devolve o valor bruto — só ele vai no e-mail; o banco guarda o hash. */
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

  /**
   * Do mais recente para o mais antigo — é a ordem em que o painel lista as
   * licenças.
   */
  async ordersByUser(userId) {
    return store.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Um pedido pelo id, **já filtrado pelo dono**. A busca recebe o usuário de
   * propósito: um `findById` puro deixaria a checagem de dono a cargo de quem
   * chama, e é assim que um dia alguém lê o recibo de outra pessoa trocando o
   * id na URL.
   */
  async findOrderById(userId, orderId) {
    return store.orders.find((o) => o.id === orderId && o.userId === userId);
  },

  /**
   * Os pedidos de uma foto — o outro lado da transação, para o painel de quem
   * a publicou.
   *
   * Diferente das buscas acima, esta **não** é filtrada por dono, e não é
   * descuido: quem pergunta aqui é o autor da foto, e ele não é o dono de
   * nenhum destes pedidos. A conferência de que a foto é mesmo dele fica com
   * quem chama, porque é lá que existe o vínculo entre conta e autor.
   *
   * Nunca devolva isto a um cliente sem essa conferência: a lista diz quem
   * comprou o quê.
   */
  async ordersByPhoto(photoId) {
    return store.orders
      .filter((o) => o.photoId === photoId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Favoritar é de quem favorita.
   *
   * Antes `isFavorited` era campo da foto, no catálogo: o mesmo coração para
   * todo visitante, igual para quem nunca entrou, e perdido no reload. Salvar
   * uma foto só quer dizer alguma coisa se for a *sua* lista — daí a chave ser
   * o usuário.
   */
  async favoritesByUser(userId) {
    return [...(store.favorites.get(userId) ?? [])];
  },

  async isFavorited(userId, photoId) {
    return store.favorites.get(userId)?.has(photoId) ?? false;
  },

  /** Alterna e devolve o estado que ficou, que é o que a tela precisa saber. */
  async toggleFavorite(userId, photoId) {
    const atuais = store.favorites.get(userId) ?? new Set<string>();
    const favoritada = !atuais.has(photoId);

    if (favoritada) atuais.add(photoId);
    else atuais.delete(photoId);

    store.favorites.set(userId, atuais);
    return favoritada;
  },
};
