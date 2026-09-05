# O banco

Postgres, servido pelo [Neon](https://vercel.com/marketplace/neon) através do
Marketplace da Vercel.

---

## Por que não SQL Server

A primeira versão deste back-end foi escrita em SQL Server, e funcionava. Vale
registrar por que não ficou, porque a pergunta volta.

**A premissa de que a Vercel "não suporta SQL Server" é falsa.** Ela também não
suporta nativamente Postgres, MySQL ou Redis: a Vercel roda Node.js, e o que dá
para alcançar de dentro de uma função é o que a rede alcança. O driver `mssql`
fala TDS por cima de `node:net`/`node:tls` através do `tedious`, que é
JavaScript puro. Conectava.

O que pesou foram três atritos que **não somem** com SQL Server, por melhor que
seja o código:

1. **O IP de saída da Vercel não é fixo** nos planos Hobby e Pro. Firewall por
   IP não fecha nada — a alternativa honesta era liberar `0.0.0.0/0` no servidor
   e defender só por credencial. Aqui esse problema não existe: a conexão é
   HTTPS autenticada por connection string, não há porta para abrir.

2. **Pool em serverless é uma conta que não fecha bem.** Cada instância da
   função é um processo com o seu próprio pool, então o total pedido ao servidor
   é `instâncias × pool_max` — vinte instâncias com pool de 10 são 200 conexões,
   e o excesso não vira fila, vira erro de login no pico. Dava para mitigar com
   pool pequeno e cache no `globalThis`, e era o que estava feito. O driver da
   Neon usado hoje conversa por **HTTPS**, sem sessão: não há pool para
   dimensionar, não há conexão ociosa segurando recurso, e uma instância fria
   não paga handshake antes da primeira linha.

3. **Preview apontando para o banco de produção.** Todo pull request abre um
   Preview Deployment, e mantê-los em bancos separados era disciplina manual —
   o tipo de coisa que funciona até o dia em que não funciona. A integração do
   Neon cria um **branch do banco por Preview** (copy-on-write, com o schema e
   os dados do pai, sem custo de armazenamento extra) e o destrói junto com o
   preview.

Some-se o contexto: o **Vercel Postgres virou Neon**. A Vercel descontinuou o
próprio serviço de Postgres, moveu as bases existentes para o Neon via
Marketplace entre o fim de 2024 e o começo de 2025, e parou de manter o
`@vercel/postgres`. Neon não é uma opção entre várias — é o caminho que a
plataforma escolheu para si.

**Quando SQL Server seria a resposta certa:** se fosse requisito (exigência
acadêmica, banco corporativo já existente, uma equipe que só escreve T-SQL).
Não era o caso. Custo, aliás, não decidiu nada: o Azure SQL tem oferta gratuita
vitalícia — 100.000 vCore-segundos de compute serverless, 32 GB de dados e 32 GB
de backup por mês — que cobriria este projeto de sobra.

O histórico está no PR que trouxe as duas versões. O contrato em
`lib/model.ts` é o que tornou a troca barata: **nenhuma rota e nenhuma página
mudou uma linha.**

---

## O que fica de fora do runtime de edge

Sendo HTTPS, o driver funcionaria até dentro do `middleware.ts`, que roda em
edge. Ele continua sem consultar o banco — confere só a presença do cookie e
deixa a assinatura para a página, como o comentário lá explica. As rotas seguem
em `runtime = 'nodejs'` por causa do `node:crypto` do hash de senha, não por
causa do banco.

Vale saber que a porta está aberta **pelo caminho da Neon**: se um dia o
middleware precisar de fato consultar o banco (uma sessão revogável, por
exemplo), dá. Pelo `pg` não daria — lá é TCP, e o edge não tem soquete.

---

## Como está implementado

```
lib/model.ts           o modelo e o contrato `Store` — quem quiser trocar o
                       armazenamento cumpre esta interface e nada mais
lib/repository.ts      a porta única dos dados; escolhe banco ou memória
lib/db.ts              os dois clientes e as consultas parametrizadas
lib/store-postgres.ts  o armazenamento em Postgres
lib/store-memory.ts    o armazenamento em memória, para desenvolver
lib/seed-catalog.ts    o acervo de demonstração, para o store em memória
db/001_schema.sql      contas, tokens, pedidos e favoritos
db/002_seed_demo.sql   contas de demonstração — nunca em produção
db/003_catalogo.sql    autores, fotos e o vínculo conta↔autor
db/004_seed_demo_catalogo.sql  acervo de demonstração — nunca em produção
scripts/migrate.mjs    `npm run db:migrate`
```

Rotas e páginas importam de `lib/repository.ts` e mais nada. A escolha do
armazenamento é **pela configuração**, não por `NODE_ENV`: com `DATABASE_URL`
definida, é o banco; sem ela, é a memória do processo. Um clone recém-feito roda
com `npm run dev` sem provisionar nada.

### As garantias moram no esquema

Verificação em JavaScript não vale nada com duas requisições ao mesmo tempo —
entre o `SELECT` e o `INSERT` cabe outra. Por isso:

| Restrição | O que garante |
| --- | --- |
| `users_email_key` | não existem duas contas com o mesmo e-mail |
| `CHECK (email = lower(email))` | a aplicação nunca esquece de normalizar |
| `orders_user_photo_key` | a licença é única por (usuário, foto) |
| `orders_price_paid_check` | não se grava pedido com preço negativo |
| FK de `orders` **sem** cascade | apagar a conta não apaga a venda que o autor recebeu |
| FK de `favorites` e tokens **com** cascade | dado acessório vai junto com a conta |
| `users_photographer_key` | uma conta por autor (índice parcial: quase todas são nulas) |
| `photos_status_check` | status fora de `rascunho`/`em-analise`/`publicada` não entra |

### O vínculo entre conta e autor

`users.photographer_id` é o campo que aposentou o `VINCULO_DEMO` — um mapa de
e-mail para id de autor, escrito à mão, que existia só porque `User` não sabia
de qual fotógrafo era. Com o campo, o painel deixou de valer só para a conta de
demonstração: qualquer conta com autor vinculado tem painel, e qualquer conta
sem ele — que é a maioria, quem só compra — vê a tela vazia com o caminho para
o cadastro de fotógrafo.

O índice é **parcial** (`WHERE photographer_id IS NOT NULL`) porque nulo não
conflita com nulo no Postgres, e ser explícito documenta que a coluna vazia é o
normal, não um caso de borda.

As funções do painel recebem o **id da conta**, não o e-mail: e-mail como chave
estrangeira funciona até a primeira pessoa querer trocar de e-mail.

### A foto nunca é apagada

`DELETE /api/fotos/{id}` grava `removed_at`; a linha fica. É a única forma de
as três promessas do site valerem ao mesmo tempo:

- o autor **tira do acervo** quando quiser;
- quem comprou **continua com o recibo e com o download**, para sempre;
- a **venda não some** do histórico do autor — o dinheiro entrou.

Um `DELETE` de verdade seria recusado pela chave estrangeira de `orders`, ou —
com `CASCADE` — apagaria a venda junto, que é registro financeiro. A coluna
`orientation` não existe pelo mesmo tipo de razão: ela sai de `height > width`,
porque guardá-la abriria a porta para o banco e a tela discordarem sobre a
mesma imagem.

O repositório aproveita isso em vez de duplicar: `ON CONFLICT DO NOTHING …
RETURNING` aparece em `createUser` e `createOrder`, e a linha devolvida (ou a
ausência dela) é que conta o que aconteceu — sem `try/catch` para separar "deu
certo" de "já existia", que é o jeito de um dia engolir um erro que não era esse.

### Onde o arquivo da foto entra

`photos.storage_key` guarda o caminho do original no bucket, e a presença dele
é o que distingue uma foto enviada de uma foto de demonstração — estas apontam
para uma URL pública e não têm original nenhum, então a coluna fica nula.

O arquivo **não passa pelas rotas**: função da Vercel recusa corpo acima de
~4,5 MB e o acervo aceita 25 MB. O navegador manda direto para o bucket e
`POST /api/fotos` recebe só o caminho — que é conferido contra o prefixo do
autor, porque o caminho vem do cliente e o id do autor vem da sessão. Ver
docs/API.md.

`full_url` guarda a URL do original no bucket, que por ser privado não abre
sozinha; quem resolve é `GET /api/pedidos/<id>/arquivo`, assinando uma URL de 5
minutos a partir de `storage_key`. Para as fotos de demonstração, que não têm
`storage_key`, a rota redireciona direto para `full_url` — é o mesmo caminho de
antes, e é por isso que o acervo de demonstração continua funcionando sem
bucket nenhum.

### Um comando por consulta

Pelo driver HTTP não há transação interativa (`BEGIN`, decidir no meio,
`COMMIT`), e o SQL foi escrito para não precisar — o que vale também pelo `pg`,
onde a transação existiria: onde seria preciso mais de um passo, o Postgres
resolve numa consulta só, com CTE. Os dois casos que valem ler:

- **`toggleFavorite`** — apaga; se não apagou nada, insere; devolve o estado que
  ficou. O `NOT EXISTS (SELECT 1 FROM removido)` não é só a condição, é o que
  **ordena** as duas partes: um CTE que lê outro roda depois dele.
- **`consumeResetToken`** — o `UPDATE … WHERE used_at IS NULL` é o que torna o
  token de uso único (quem marcar a linha é quem usa), e o `SELECT` ao lado
  separa "venceu" de "não existe / já foi usado", vendo a linha como estava
  antes do UPDATE.

Se um dia aparecer algo genuinamente interativo — cobrança, provavelmente —
há duas saídas: o `Pool` por WebSocket que o próprio pacote da Neon exporta, ou
o `pg` que já está aqui para o caminho do Postgres comum.

---

## Passo a passo — Neon pela Vercel

**1. Instalar.** No painel do projeto na Vercel: **Storage** (ou Marketplace) →
**Neon** → **Connect Project**. Escolha a região mais perto dos seus usuários e
a mesma da função. Provisionamento e cobrança ficam pela Vercel; o painel do
Neon continua acessível com o mesmo login.

**2. As variáveis aparecem sozinhas.** A integração injeta `DATABASE_URL` (e as
demais `PG*`) em Production, Preview e Development. Não há nada para copiar à
mão, e não há segredo para vazar em commit.

**3. Ligar o branch por Preview.** Nas configurações da integração, ative a
criação automática de um branch do banco por Preview Deployment. É o que faz
cada pull request escrever no seu próprio banco, com uma cópia dos dados, e
limpar sozinho quando o preview morre.

**4. Migrar.** Localmente, com `DATABASE_URL` no `.env.local`:

```bash
npm run db:migrate            # só o esquema
npm run db:migrate -- --seed  # com as contas de demonstração (local!)
```

O script registra o que aplicou em `schema_migrations`; rodar de novo não faz
nada. Cada arquivo vai numa transação só, com o registro dele junto — no
Postgres o DDL é transacional, então não existe o estado "metade das tabelas
criadas".

**5. Conferir.** Faça login com uma conta de teste, compre uma foto, e olhe no
painel do Neon (ou por `psql`):

```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
```

---

## Postgres local, para desenvolver

Não é obrigatório — sem `DATABASE_URL` o site roda na memória. Mas se quiser o
banco de verdade na sua máquina:

```bash
docker run -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=revela \
  -p 5432:5432 -d postgres:16
```

```bash
# .env.local
DATABASE_URL=postgresql://postgres:dev@localhost:5432/revela
```

A aplicação enxerga esse banco sem nenhum ajuste: `lib/db.ts` escolhe o cliente
pelo host da URL — endpoint `*.neon.tech` vai pelo driver HTTP, qualquer outro
host vai pelo `pg`, por TCP. É a mesma decisão em um lugar só, e o
`store-postgres.ts` não sabe qual dos dois está atendendo.

O `npm run db:migrate` é a exceção: ele usa só o driver HTTP. Para um Postgres
comum, aplique os arquivos direto — é o que os testes deste repositório fazem:

```bash
for f in db/00*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

Sem `db/003` e `db/004` o acervo fica vazio: as tabelas `photographers` e
`photos` nascem nelas.

---

## O que este documento não resolve

- **Rate limiting ainda é em memória** (`lib/rate-limit.ts`). Com várias
  instâncias, cada uma tem a sua contagem e o limite deixa de valer. Vai para
  Redis/Upstash ou para o gateway. É o furo mais próximo de virar problema.
- **Sessão não é revogável.** O token é assinado e válido até expirar; o logout
  só apaga o cookie. Revogar exige guardar a sessão do lado do servidor — e
  agora dá para consultar isso até no middleware.
- **Fotos ainda não têm tabela.** O acervo vive em `lib/mock-photos.ts`, e por
  isso `orders.photo_id` e `favorites.photo_id` são texto solto, sem chave
  estrangeira. Quando `photos` existir, as FKs entram numa migração nova.
- **Não há cobrança.** O pedido registra preço e versão da licença; falta o
  pagamento no meio.
- **Restauração de backup não foi testada.** O Neon faz *point-in-time
  recovery*; backup que nunca foi restaurado é backup que talvez não exista.

---

## Checklist antes de apontar a produção para o banco

- [ ] Branch por Preview ativado (nenhum PR escrevendo na base de produção)
- [ ] `db/002_seed_demo.sql` **não** aplicado em produção
- [ ] Região da função igual à do banco
- [ ] `AUTH_SECRET` forte e distinto do de desenvolvimento
- [ ] Limpeza periódica de `password_reset_tokens` vencidos agendada
- [ ] Restauração testada uma vez, de verdade
