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

/**
 * A foto como a memória a guarda: a de sempre, mais a marca de remoção.
 *
 * `removedAt` não está em `StoredPhoto` de propósito. No Postgres ele é uma
 * coluna que as consultas filtram e nunca devolvem; deixá-lo no tipo público
 * convidaria cada tela a escrever o seu próprio `if (foto.removedAt)`, que é
 * exatamente a regra que deve morar num lugar só. O `publico()` abaixo o tira
 * na saída, para as duas implementações devolverem a mesma coisa.
 */
interface FotoNaMemoria extends StoredPhoto {
  removedAt?: number;
}

interface MemoryStore {
  users: User[];
  orders: Order[];
  /** Cópia mutável do acervo: editar e remover no painel precisam de onde escrever. */
  photos: FotoNaMemoria[];
  photographers: Photographer[];
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
    // O vínculo que era um mapa de e-mail para id de autor escrito à mão.
    // Agora é um campo, aqui e na coluna `users.photographer_id`.
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
  // Cópias rasas: editar uma foto no painel não pode alterar a semente, senão
  // o `npm run dev` seguinte já começaria com a alteração dentro do "acervo
  // original" e não haveria como voltar sem reiniciar o editor.
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
   * Os pedidos das fotos de um autor. O `userId` vem junto porque está no
   * `Order` — mas a tela de vendas não o mostra. Ver `lib/model.ts`.
   */
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

  /* ------------------------- acervo — leitura pública --------------------- */

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

  /** Sem filtro de estado — é o ponto. Ver o contrato em `lib/model.ts`. */
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
      // A capa é a primeira foto da categoria: o cartão mostra o acervo que
      // promete, não uma imagem avulsa.
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

  /* -------------------------------- autores -------------------------------- */

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

  /* --------------------------- painel — escrita ---------------------------- */

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

  /**
   * O filtro por autor faz parte da busca, e não é um `if` antes dela: quem
   * procura a foto e só depois compara o dono é quem um dia esquece de
   * comparar. Foto de outra pessoa devolve `undefined`.
   */
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

  /** Marca, não apaga — a licença de quem comprou é perpétua. Ver `lib/model.ts`. */
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

/* ------------------------------- auxiliares ------------------------------- */

/** No acervo: publicada e não removida — a mesma definição do SQL. */
function noAcervo(foto: FotoNaMemoria): boolean {
  return !foto.removedAt && foto.status === 'publicada';
}

/**
 * Mais recente primeiro; o id desempata. As catorze fotos de demonstração
 * nascem no mesmo instante, e sem o desempate a home embaralharia a cada
 * render.
 */
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
