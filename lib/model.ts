/**
 * O modelo de dados e o contrato que toda implementação de armazenamento
 * cumpre — a de memória e a do Postgres.
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
  /**
   * O autor que esta conta assina, se ela for de autor.
   *
   * Ausente na maioria — quem só compra não é fotógrafo, e isso é o normal,
   * não um caso de borda. Este campo é o que aposentou o `VINCULO_DEMO`, o
   * mapa de e-mail para id de autor que existia só porque `User` não o tinha.
   */
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

/* -------------------------------- acervo --------------------------------- */

/**
 * A ficha pública de uma foto — o que qualquer visitante pode ver.
 *
 * Morava em `lib/mock-photos.ts`, junto do array de demonstração. Saiu de lá
 * quando o acervo virou tabela: o tipo é do site, o array é de uma das duas
 * implementações de armazenamento.
 */
export interface Photo {
  id: string;
  title: string;
  photographer: { id: string; name: string };
  price: number;
  rating: number;
  thumbnailUrl: string;
  /** Arquivo em resolução de entrega — só sai por `/api/pedidos/<id>/arquivo`. */
  fullUrl: string;
  /** Medida do arquivo entregue, em pixels. É o que a ficha da foto mostra. */
  width: number;
  height: number;
  category: string;
  /**
   * Derivada de `height > width`, nunca guardada.
   *
   * Uma coluna separada abriria a porta para uma foto 3000×2000 marcada como
   * vertical — e então a tela e o banco discordariam sobre a mesma imagem.
   */
  orientation: 'horizontal' | 'vertical';
}

/**
 * Onde a foto está no caminho até o acervo.
 *
 * `rascunho` é do autor e de mais ninguém; `em-analise` já foi enviada e
 * espera a curadoria; `publicada` está à venda. Um quarto estado — recusada —
 * só vale a pena existir junto com o motivo da recusa, e o motivo é texto que
 * alguém precisa escrever. Fica de fora até haver quem escreva.
 */
export type PhotoStatus = 'rascunho' | 'em-analise' | 'publicada';

/** A foto como o armazenamento a devolve: a ficha pública mais o estado dela. */
export interface StoredPhoto extends Photo {
  status: PhotoStatus;
  createdAt: number;
  /**
   * Última alteração na ficha. Ausente até a primeira edição — uma data
   * inventada (a de hoje, a da criação) seria pior que data nenhuma, porque
   * *parece* informação.
   */
  updatedAt?: number;
}

/**
 * O que o envio de uma foto grava.
 *
 * Não há `status`: quem decide é a rota, e ela decide `publicada`. O padrão da
 * coluna é `rascunho` para o caso de alguém inserir sem dizer nada — mas a
 * curadoria não existe, e uma foto que entrasse em `em-analise` esperaria para
 * sempre por um revisor que não há.
 *
 * `thumbnailUrl` e `fullUrl` são as duas caras do mesmo arquivo: a pública, que
 * o acervo mostra, e a de entrega, que só sai por `/api/pedidos/<id>/arquivo`.
 * `storageKey` é o caminho do original no bucket — é ele que a URL assinada
 * resolve, e a presença dele é o que distingue uma foto enviada de uma foto de
 * demonstração.
 */
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

/** O que uma edição pode mudar. Campo ausente fica como está. */
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
  /**
   * Contagem das fotos no acervo, **derivada**. O catálogo de demonstração
   * trazia 284 para quem tinha 3; número que ninguém pode conferir é número
   * que mais cedo ou mais tarde mente.
   */
  photoCount: number;
  rating: number;
}

/** Uma categoria do acervo, derivada das fotos que existem nela. */
export interface Category {
  id: string;
  name: string;
  slug: string;
  photoCount: number;
  thumbnailUrl: string;
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
  /**
   * Todas as licenças emitidas das fotos de um autor, da mais recente para a
   * mais antiga.
   *
   * Recebe o **autor**, e não uma foto, de propósito: a versão anterior pedia
   * os pedidos de uma foto por vez, e o painel consultava o acervo foto a foto
   * para montar uma tela só. Aqui a junção é do banco.
   *
   * O `userId` de cada pedido vem junto porque está no `Order` — mas **não o
   * mostre ao autor**. Ninguém decidiu que quem vende pode saber a identidade
   * de quem licencia, e a tela funciona sem. Se um dia decidirem o contrário,
   * o lugar da mudança é `vendasDoAutor`, não aqui.
   */
  ordersByAuthor(photographerId: string): Promise<Order[]>;

  /**
   * Quantas licenças cada foto do autor já emitiu, e quanto somaram.
   *
   * Um `GROUP BY`, e não uma contagem guardada na foto: número gravado diverge
   * do que aconteceu no dia em que um pedido for estornado. A chave é o id da
   * foto; foto sem venda não aparece, e quem lê trata a ausência como zero —
   * que é a resposta certa.
   */
  salesByAuthor(
    photographerId: string,
  ): Promise<Record<string, { sales: number; revenue: number }>>;

  /* favoritos */
  favoritesByUser(userId: string): Promise<string[]>;
  isFavorited(userId: string, photoId: string): Promise<boolean>;
  toggleFavorite(userId: string, photoId: string): Promise<boolean>;

  /* acervo — leitura pública */

  /**
   * O acervo: só o que está publicado e não saiu. `undefined` em `category`
   * quer dizer o acervo inteiro.
   */
  listPhotos(options?: { category?: string }): Promise<StoredPhoto[]>;
  /** Uma foto **do acervo**. Rascunho e removida respondem `undefined`. */
  findPhoto(photoId: string): Promise<StoredPhoto | undefined>;
  /**
   * A mesma foto, **em qualquer estado**, inclusive removida do acervo.
   *
   * Existe por causa da licença perpétua: o recibo de quem comprou tem de
   * continuar mostrando o que foi comprado depois de o autor tirar a foto de
   * venda. Não use nas telas públicas — é justamente o que `findPhoto` recusa.
   */
  findSoldPhoto(photoId: string): Promise<StoredPhoto | undefined>;
  /** As fotos publicadas de um autor, para a página de perfil. */
  photosByPhotographer(photographerId: string): Promise<StoredPhoto[]>;
  /** As categorias que têm foto, derivadas do acervo. */
  listCategories(): Promise<Category[]>;

  /* autores */

  findPhotographer(photographerId: string): Promise<Photographer | undefined>;
  listPhotographers(): Promise<Photographer[]>;
  /**
   * O autor de uma conta, ou `undefined` se a conta não é de autor.
   *
   * É este método que substituiu o `VINCULO_DEMO` — o mapa de e-mail para id
   * de autor que existia só porque `User` não tinha o campo.
   */
  photographerOfUser(userId: string): Promise<Photographer | undefined>;

  /* painel do autor — escrita */

  /**
   * Grava a foto enviada. O id é gerado aqui, como o de usuário e o de pedido.
   *
   * Recebe o autor em vez de confiar num campo do corpo: quem envia não escolhe
   * de quem é a foto.
   */
  createPhoto(input: NewPhoto): Promise<StoredPhoto>;

  /**
   * Tudo o que o autor tem no painel: rascunho, em análise e publicada. Só as
   * removidas ficam de fora, que é o que "remover" quer dizer.
   */
  photosOfAuthor(
    photographerId: string,
    options?: {
      /**
       * Traz também as que saíram do acervo.
       *
       * O painel **não** as quer: removida é removida, e continuar listando
       * seria desfazer o que a pessoa pediu. A tela de vendas quer, porque uma
       * venda não some quando a foto sai — o dinheiro entrou, e o recibo do
       * outro lado continua de pé.
       */
      includeRemoved?: boolean;
    },
  ): Promise<StoredPhoto[]>;
  /**
   * Edita, **já filtrado pelo autor**. Foto de outra pessoa devolve
   * `undefined`, que quem chama trata como 404 — nunca 403: "existe, mas não é
   * sua" já conta quantas fotos o acervo tem e quais ids são válidos.
   */
  updatePhoto(
    photographerId: string,
    photoId: string,
    patch: PhotoPatch,
  ): Promise<StoredPhoto | undefined>;
  /**
   * Tira do acervo, **sem apagar a linha**. A licença de quem já comprou é
   * perpétua, e o recibo precisa continuar resolvendo — ver
   * `db/003_catalogo.sql`. Devolve `false` se a foto não é do autor.
   */
  removePhoto(photographerId: string, photoId: string): Promise<boolean>;
}
