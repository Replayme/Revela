/**
 * O modelo de dados e o contrato que toda implementação de armazenamento
 * cumpre — a de memória e a do SQL Server.
 *
 * Existe para que a troca de uma pela outra não seja uma reescrita: as rotas
 * falam com `lib/repository.ts`, que fala com uma destas duas. Tipos num
 * arquivo só, sem dependência nenhuma, também é o que evita o ciclo de import
 * entre o repositório e as implementações.
 *
 * **Toda função é assíncrona, inclusive na versão em memória.** Não é
 * cerimônia: uma função síncrona hoje é uma chamada sem `await` amanhã, e o
 * dia da virada para o banco viraria uma caçada a `Promise` vazando na tela.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  /** Formato de `lib/password.ts`: `scrypt$<salt>$<hash>`. */
  passwordHash: string;
  disabled?: boolean;
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
  /** Preço no momento da compra: mudar a tabela não muda o que já foi pago. */
  pricePaid: number;
  /** Versão da licença aceita: reescrever o texto não altera pedidos antigos. */
  licenseVersion: string;
  /** Epoch em milissegundos, como o resto do site trata data. */
  createdAt: number;
}

/**
 * O resultado de emitir uma licença.
 *
 * `created: false` quer dizer que a pessoa já tinha essa foto e o pedido
 * devolvido é o antigo. A rota precisa saber a diferença para responder 200 +
 * `alreadyOwned` em vez de 201 — e precisa saber mesmo quando a checagem
 * anterior disse que não havia pedido: entre a consulta e o INSERT cabe outra
 * requisição da mesma pessoa, e é o índice único que decide, não a consulta.
 */
export interface CreateOrderResult {
  order: Order;
  created: boolean;
}

export interface Store {
  /* usuários */
  findUserByEmail(email: string): Promise<User | undefined>;
  createUser(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<CreateUserResult>;
  updatePassword(userId: string, password: string): Promise<boolean>;

  /* redefinição de senha */
  createResetToken(userId: string): Promise<string>;
  consumeResetToken(token: string): Promise<ResetCheck>;

  /* pedidos */
  createOrder(input: {
    userId: string;
    photoId: string;
    pricePaid: number;
    licenseVersion: string;
  }): Promise<CreateOrderResult>;
  findOrder(userId: string, photoId: string): Promise<Order | undefined>;
  ordersByUser(userId: string): Promise<Order[]>;
  findOrderById(userId: string, orderId: string): Promise<Order | undefined>;
  ordersByPhoto(photoId: string): Promise<Order[]>;

  /* favoritos */
  favoritesByUser(userId: string): Promise<string[]>;
  isFavorited(userId: string, photoId: string): Promise<boolean>;
  toggleFavorite(userId: string, photoId: string): Promise<boolean>;
}
