/*
  Revela — esquema inicial (SQL Server 2019+ / Azure SQL Database).

  Roda inteiro mais de uma vez sem estragar nada: todo objeto é criado dentro
  de um `IF NOT EXISTS`. É o que permite aplicar a mesma migração num banco
  novo e num que já rodou metade — cenário normal quando o deploy falha no
  meio.

  O que está aqui e não no código, de propósito:

    - unicidade de e-mail e de licença por (usuário, foto). Verificação em
      JavaScript não vale nada com duas requisições ao mesmo tempo: entre o
      SELECT e o INSERT cabe outra. Índice único vale sempre.
    - o instante de criação, via SYSUTCDATETIME(). Em UTC, sempre: o fuso da
      função na Vercel não é o do servidor, e duas linhas gravadas por
      instâncias diferentes precisam ser comparáveis.

  Fotos ainda não têm tabela — o acervo vive em `lib/mock-photos.ts`. Por isso
  `orders.photo_id` e `favorites.photo_id` são texto solto, sem chave
  estrangeira. Quando `dbo.photos` existir, as duas FKs entram numa migração
  nova; o índice que elas vão precisar já está criado.
*/

/* --------------------------------- users --------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.users (
    id             VARCHAR(64)   NOT NULL,
    name           NVARCHAR(120) NOT NULL,
    -- 320 = 64 (parte local) + 1 (@) + 255 (domínio), o máximo do RFC 5321.
    -- CI_AS: "Ana@Revela.com" e "ana@revela.com" são a mesma conta para o
    -- índice único abaixo. A aplicação também normaliza, mas depender só dela
    -- deixaria a garantia do lado errado.
    email          NVARCHAR(320) COLLATE Latin1_General_100_CI_AS NOT NULL,
    -- 'scrypt$<salt hex>$<hash hex>' hoje; cabe argon2id amanhã sem ALTER.
    password_hash  VARCHAR(255)  NOT NULL,
    disabled       BIT           NOT NULL CONSTRAINT DF_users_disabled   DEFAULT (0),
    created_at     DATETIME2(3)  NOT NULL CONSTRAINT DF_users_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_users PRIMARY KEY (id)
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_users_email' AND object_id = OBJECT_ID('dbo.users'))
  CREATE UNIQUE INDEX UX_users_email ON dbo.users (email);

/* ------------------------- password_reset_tokens ------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'password_reset_tokens' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.password_reset_tokens (
    -- HMAC-SHA256 em hexadecimal do token que foi no e-mail. O valor bruto
    -- nunca é gravado: quem ler esta tabela não redefine a senha de ninguém.
    token_hash  CHAR(64)     NOT NULL,
    user_id     VARCHAR(64)  NOT NULL,
    expires_at  DATETIME2(3) NOT NULL,
    -- Marcado no momento do uso. É o `WHERE used_at IS NULL` do UPDATE que
    -- torna o token de uso único, não um `if` na aplicação.
    used_at     DATETIME2(3) NULL,
    created_at  DATETIME2(3) NOT NULL CONSTRAINT DF_prt_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_password_reset_tokens PRIMARY KEY (token_hash),
    -- Conta apagada leva junto os pedidos de redefinição dela.
    CONSTRAINT FK_prt_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_prt_user' AND object_id = OBJECT_ID('dbo.password_reset_tokens'))
  CREATE INDEX IX_prt_user ON dbo.password_reset_tokens (user_id);

-- Para a limpeza periódica das vencidas. A limpeza é rotina de manutenção, não
-- trabalho do caminho da requisição: apagar linha no meio de um login é gastar
-- a latência de quem está esperando com serviço de outra pessoa.
--   DELETE FROM dbo.password_reset_tokens WHERE expires_at < DATEADD(day, -7, SYSUTCDATETIME());
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_prt_expires_at' AND object_id = OBJECT_ID('dbo.password_reset_tokens'))
  CREATE INDEX IX_prt_expires_at ON dbo.password_reset_tokens (expires_at);

/* -------------------------------- orders --------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'orders' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.orders (
    id               VARCHAR(64)   NOT NULL,
    user_id          VARCHAR(64)   NOT NULL,
    photo_id         VARCHAR(64)   NOT NULL,
    -- DECIMAL, nunca FLOAT: preço em ponto flutuante é como se perde centavo.
    -- O valor é o da tabela no momento da compra — mudar o preço da foto não
    -- muda o que já foi pago.
    price_paid       DECIMAL(10,2) NOT NULL,
    -- Versão do texto aceito. Reescrever a licença não altera pedidos antigos.
    license_version  VARCHAR(20)   NOT NULL,
    created_at       DATETIME2(3)  NOT NULL CONSTRAINT DF_orders_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_orders PRIMARY KEY (id),
    -- Sem ON DELETE CASCADE, e é decisão, não esquecimento: pedido é registro
    -- financeiro. Apagar a conta não pode apagar a venda que o autor da foto
    -- já recebeu. Quem quiser sumir com a conta primeiro decide o que fazer
    -- com os pedidos dela.
    CONSTRAINT FK_orders_user FOREIGN KEY (user_id) REFERENCES dbo.users (id)
  );
END;

-- A licença é perpétua e única: comprar de novo a mesma foto devolve a que já
-- existe. Quem garante isso é este índice, e é por causa dele que a rota pode
-- tratar o erro de duplicidade como "já era sua" com segurança.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_orders_user_photo' AND object_id = OBJECT_ID('dbo.orders'))
  CREATE UNIQUE INDEX UX_orders_user_photo ON dbo.orders (user_id, photo_id);

-- O painel lista as licenças da pessoa da mais recente para a mais antiga.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_orders_user_created' AND object_id = OBJECT_ID('dbo.orders'))
  CREATE INDEX IX_orders_user_created ON dbo.orders (user_id, created_at DESC);

-- O outro lado: as vendas de uma foto, para o painel de quem a publicou.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_orders_photo_created' AND object_id = OBJECT_ID('dbo.orders'))
  CREATE INDEX IX_orders_photo_created ON dbo.orders (photo_id, created_at DESC);

/* ------------------------------- favorites -------------------------------- */

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'favorites' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.favorites (
    user_id     VARCHAR(64)  NOT NULL,
    photo_id    VARCHAR(64)  NOT NULL,
    created_at  DATETIME2(3) NOT NULL CONSTRAINT DF_favorites_created_at DEFAULT (SYSUTCDATETIME()),
    -- A chave é o par: favoritar é de quem favorita, e favoritar duas vezes a
    -- mesma foto não existe como estado.
    CONSTRAINT PK_favorites PRIMARY KEY (user_id, photo_id),
    CONSTRAINT FK_favorites_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE
  );
END;

-- A lista de favoritos sai na ordem em que foram salvos, do mais novo para o
-- mais antigo; a PK ordena por user_id, photo_id e não serviria.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_favorites_user_created' AND object_id = OBJECT_ID('dbo.favorites'))
  CREATE INDEX IX_favorites_user_created ON dbo.favorites (user_id, created_at DESC);
