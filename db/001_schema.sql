-- Revela — esquema inicial (PostgreSQL 14+ / Neon).
--
-- Roda inteiro mais de uma vez sem estragar nada: todo objeto é criado com
-- `IF NOT EXISTS`. É o que permite aplicar a mesma migração num banco novo e
-- num que já rodou metade — cenário normal quando o deploy falha no meio.
--
-- O que está aqui e não no código, de propósito:
--
--   * unicidade de e-mail e de licença por (usuário, foto). Verificação em
--     JavaScript não vale nada com duas requisições ao mesmo tempo: entre o
--     SELECT e o INSERT cabe outra. Restrição de tabela vale sempre, e é
--     também o que faz o `ON CONFLICT DO NOTHING` do repositório funcionar.
--   * o instante de criação, via `now()`. `TIMESTAMPTZ` guarda o instante
--     absoluto, não a leitura de um relógio local: duas linhas gravadas por
--     instâncias em regiões diferentes continuam comparáveis.
--
-- `TEXT` em vez de `VARCHAR(n)`: no Postgres os dois são a mesma coisa por
-- dentro, e o limite de tamanho vive em `lib/validation.ts`, junto com as
-- outras regras de formulário. Truncar e-mail em 320 caracteres no banco só
-- faria a mensagem de erro sair pior.
--
-- Fotos ainda não têm tabela — o acervo vive em `lib/mock-photos.ts`. Por isso
-- `orders.photo_id` e `favorites.photo_id` são texto solto, sem chave
-- estrangeira. Quando `photos` existir, as duas FKs entram numa migração nova;
-- os índices que elas vão precisar já estão criados.

-- ------------------------------- users -------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id             TEXT        PRIMARY KEY,
  name           TEXT        NOT NULL,
  -- O Postgres compara texto respeitando maiúsculas, então a normalização em
  -- minúsculas é o que faz a unicidade valer de verdade — sem ela,
  -- "Ana@Revela.com" abriria uma segunda conta ao lado de "ana@revela.com".
  -- A aplicação normaliza; este CHECK é o que garante que ela nunca esqueça.
  email          TEXT        NOT NULL UNIQUE CHECK (email = lower(email)),
  -- 'scrypt$<salt hex>$<hash hex>' hoje; cabe argon2id amanhã sem migração.
  password_hash  TEXT        NOT NULL,
  disabled       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------ password_reset_tokens -----------------------------

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  -- HMAC-SHA256 em hexadecimal do token que foi no e-mail. O valor bruto
  -- nunca é gravado: quem ler esta tabela não redefine a senha de ninguém.
  token_hash  TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  -- Marcado no momento do uso. É o `WHERE used_at IS NULL` do UPDATE que
  -- torna o token de uso único, não um `if` na aplicação.
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id);

-- Para a limpeza periódica das vencidas. A limpeza é rotina de manutenção, não
-- trabalho do caminho da requisição: apagar linha no meio de um login é gastar
-- a latência de quem está esperando com serviço de outra pessoa.
--   DELETE FROM password_reset_tokens WHERE expires_at < now() - INTERVAL '7 days';
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_idx
  ON password_reset_tokens (expires_at);

-- ------------------------------- orders -------------------------------------

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT          PRIMARY KEY,
  -- Sem ON DELETE CASCADE, e é decisão, não esquecimento: pedido é registro
  -- financeiro. Apagar a conta não pode apagar a venda que o autor da foto já
  -- recebeu. Quem quiser sumir com a conta primeiro decide o que fazer com os
  -- pedidos dela.
  user_id          TEXT          NOT NULL REFERENCES users (id),
  photo_id         TEXT          NOT NULL,
  -- NUMERIC, nunca DOUBLE: preço em ponto flutuante é como se perde centavo.
  -- O valor é o da tabela no momento da compra — mudar o preço da foto não
  -- muda o que já foi pago.
  price_paid       NUMERIC(10,2) NOT NULL CHECK (price_paid >= 0),
  -- Versão do texto aceito. Reescrever a licença não altera pedidos antigos.
  license_version  TEXT          NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  -- A licença é perpétua e única: comprar de novo a mesma foto devolve a que
  -- já existe. Quem garante isso é esta restrição, e é por causa dela que a
  -- rota pode tratar "não inseriu" como "já era sua" com segurança.
  CONSTRAINT orders_user_photo_key UNIQUE (user_id, photo_id)
);

-- O painel lista as licenças da pessoa da mais recente para a mais antiga.
CREATE INDEX IF NOT EXISTS orders_user_created_idx
  ON orders (user_id, created_at DESC);

-- O outro lado: as vendas de uma foto, para o painel de quem a publicou.
CREATE INDEX IF NOT EXISTS orders_photo_created_idx
  ON orders (photo_id, created_at DESC);

-- ------------------------------ favorites -----------------------------------

CREATE TABLE IF NOT EXISTS favorites (
  user_id     TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  photo_id    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A chave é o par: favoritar é de quem favorita, e favoritar duas vezes a
  -- mesma foto não existe como estado. É também o alvo do `ON CONFLICT DO
  -- NOTHING` em `toggleFavorite`.
  PRIMARY KEY (user_id, photo_id)
);

-- A lista de favoritos sai na ordem em que foram salvos, do mais novo para o
-- mais antigo; a chave primária ordena por (user_id, photo_id) e não serviria.
CREATE INDEX IF NOT EXISTS favorites_user_created_idx
  ON favorites (user_id, created_at DESC);
