-- Revela — o acervo sai do código e entra no banco.
--
-- Até aqui o acervo era um array em `lib/mock-photos.ts` e os autores outro em
-- `lib/mock-photographers.ts`. Enquanto ninguém podia publicar nem editar, isso
-- bastava. Não basta mais: `PATCH /api/fotos/{id}` precisa de onde gravar, e o
-- painel do autor precisa saber de quem é cada foto sem consultar uma tabela de
-- demonstração escrita à mão.
--
-- A mudança mais importante deste arquivo é a coluna `users.photographer_id`.
-- Ela mata o `VINCULO_DEMO` de `lib/photographer-panel-data.ts` — o mapa de
-- e-mail para id de autor que existia porque `User` não sabia de qual fotógrafo
-- era. Com o campo, o painel vale para qualquer conta, não só a da demonstração.

-- --------------------------- photographers ---------------------------------

CREATE TABLE IF NOT EXISTS photographers (
  -- Slug legível ('ana-vilar'), porque aparece em /perfil/{id}. Id opaco numa
  -- URL que a pessoa divulga não ajuda ninguém, e o nome não é segredo.
  id               TEXT        PRIMARY KEY,
  name             TEXT        NOT NULL,
  avatar_url       TEXT        NOT NULL,
  cover_photo_url  TEXT        NOT NULL,
  -- Herdado do catálogo de demonstração. Vira média de avaliações reais no dia
  -- em que houver tabela de avaliação; até lá é um número que ninguém mediu, e
  -- está aqui só porque a ficha do autor já o mostra.
  rating           NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- `photoCount` **não** é coluna, de propósito. O catálogo de demonstração dizia
-- 284 fotos para quem tinha 3, e foi por inventar número que não se podia
-- conferir que a home perdeu seis deles. Sai de um COUNT sobre `photos`.

-- ------------------------ users.photographer_id -----------------------------

ALTER TABLE users ADD COLUMN IF NOT EXISTS photographer_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_photographer_fk') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_photographer_fk
      FOREIGN KEY (photographer_id) REFERENCES photographers (id);
  END IF;
END $$;

-- Uma conta por autor. Índice **parcial**: `NULL` não conflita com `NULL` no
-- Postgres, mas ser explícito aqui documenta que a maioria das contas não é de
-- autor nenhum — quem só compra tem `photographer_id` nulo, e isso é o normal,
-- não um caso de borda.
CREATE UNIQUE INDEX IF NOT EXISTS users_photographer_key
  ON users (photographer_id) WHERE photographer_id IS NOT NULL;

-- -------------------------------- photos ------------------------------------

CREATE TABLE IF NOT EXISTS photos (
  id               TEXT          PRIMARY KEY,
  photographer_id  TEXT          NOT NULL REFERENCES photographers (id),
  title            TEXT          NOT NULL,
  category         TEXT          NOT NULL,
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  rating           NUMERIC(2,1)  NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),

  -- Estar no catálogo não é mais o mesmo que estar publicada: agora existe
  -- quem grave rascunho e análise. O CHECK repete a união de
  -- `PhotoStatus` (lib/photographer-panel.ts) porque um status escrito errado
  -- entra calado e só aparece na tela, meses depois, como um card sem rótulo.
  status           TEXT          NOT NULL DEFAULT 'rascunho'
                     CHECK (status IN ('rascunho', 'em-analise', 'publicada')),

  -- Medidas do arquivo entregue. Lidas da imagem no envio, nunca digitadas.
  width            INTEGER       NOT NULL CHECK (width > 0),
  height           INTEGER       NOT NULL CHECK (height > 0),

  thumbnail_url    TEXT          NOT NULL,
  full_url         TEXT          NOT NULL,
  -- Onde o original vive no bucket. Nulo enquanto o bucket não existe — as
  -- fotos de demonstração apontam para uma URL pública e não têm original
  -- nenhum. Quando `POST /api/fotos` entrar, esta coluna é o que a URL assinada
  -- de vida curta vai resolver, e `full_url` deixa de ser endereço fixo.
  storage_key      TEXT,

  -- Saiu do acervo, mas a linha fica. Ver o bloco sobre licença perpétua
  -- abaixo — é a única razão de `DELETE /api/fotos/{id}` não ser um DELETE.
  removed_at       TIMESTAMPTZ,

  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  -- Nula até a primeira edição. `PhotographerPhoto.updatedAt` é opcional pelo
  -- mesmo motivo: sem edição, uma data (a de hoje, a da criação) *pareceria*
  -- informação sem ser.
  updated_at       TIMESTAMPTZ
);

-- `orientation` **não** é coluna: sai de `height > width`. Guardar os dois
-- deixaria a porta aberta para uma foto 3000×2000 marcada como vertical, e
-- então a tela e o banco discordariam sobre a mesma imagem.

-- O acervo, e o filtro por categoria: as duas leituras públicas.
CREATE INDEX IF NOT EXISTS photos_catalogo_idx
  ON photos (status, created_at DESC) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS photos_categoria_idx
  ON photos (category) WHERE removed_at IS NULL;
-- O painel: as fotos de um autor, inclusive rascunho e despublicada.
CREATE INDEX IF NOT EXISTS photos_autor_idx
  ON photos (photographer_id, created_at DESC);

-- --------------------- pedidos e favoritos apontam para fotos ----------------
--
-- Até aqui `orders.photo_id` e `favorites.photo_id` eram texto solto porque não
-- havia tabela para referenciar. Agora há.
--
-- **A licença é perpétua, e é isso que decide o desenho.** Se a chave
-- estrangeira de `orders` fosse comum, apagar uma foto vendida seria impossível
-- (o banco recusaria) — e a tela de remover, que promete tirar do acervo sem
-- alcançar quem já comprou, estaria mentindo. Se fosse `ON DELETE CASCADE`,
-- apagar a foto apagaria a venda, que é registro financeiro.
--
-- A saída é a foto **nunca ser apagada**: `removed_at` a tira do acervo e do
-- painel, e a linha continua ali para o recibo de quem comprou resolver, para
-- sempre. `DELETE /api/fotos/{id}` grava `removed_at`; a chave estrangeira
-- abaixo, então, nunca é testada de verdade — e está aqui justamente para
-- garantir que continue assim.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_photo_fk') THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_photo_fk FOREIGN KEY (photo_id) REFERENCES photos (id);
  END IF;

  -- Favoritos são acessórios: se um dia uma foto for mesmo apagada (nunca pelo
  -- caminho da aplicação), os favoritos dela vão junto sem deixar lixo.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorites_photo_fk') THEN
    ALTER TABLE favorites
      ADD CONSTRAINT favorites_photo_fk
      FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE;
  END IF;
END $$;
