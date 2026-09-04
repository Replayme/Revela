# SQL Server na Vercel

## A premissa que costuma travar tudo

> "A Vercel não tem suporte nativo a SQL Server."

Ela também não tem suporte nativo a Postgres, a MySQL nem a Redis. A Vercel
roda **Node.js** — o que dá para alcançar de dentro de uma função é o que a
rede alcança, e ponto. O driver `mssql` fala TDS por cima de `node:net` e
`node:tls` através do `tedious`, que é JavaScript puro: sem binário nativo, sem
ODBC, sem `msnodesqlv8`. Não há nada para a plataforma "suportar".

Existem dois lugares onde de fato **não** funciona, e vale conhecê-los antes:

1. **Runtime de edge.** Lá não existe soquete TCP cru, só `fetch`. É por isso
   que o `middleware.ts` deste projeto confere apenas a *presença* do cookie e
   deixa a verificação da assinatura para a página — o comentário está lá. Toda
   rota que fala com o banco declara `export const runtime = 'nodejs'`.
2. **Build e prerender.** Uma página estática que consulta o banco congela o
   resultado no momento do deploy. As rotas daqui são `dynamic = 'force-dynamic'`.

O problema real não é o SQL Server. É a **rede**.

---

## O problema real: rede, não driver

### 1. O banco precisa ser alcançável

A função roda na infraestrutura da Vercel, não na sua. Ou o banco tem endpoint
público (com TLS), ou existe alguma coisa entre os dois.

### 2. O IP de saída da Vercel não é fixo

Nos planos Hobby e Pro, a função sai por um IP que muda. Firewall por IP não
fecha nada: você acabaria liberando `0.0.0.0/0`, que é liberar a internet.

As saídas honestas são três:

- **Aceitar o endpoint público** e defender por credencial + TLS + auditoria,
  não por IP. É o que a maioria dos projetos deste tamanho faz.
- **IP de saída dedicado** (Vercel Secure Compute, plano Enterprise): aí existe
  faixa fixa para liberar no firewall.
- **Não expor o banco** e pôr uma API sua no meio (topologia C, abaixo).

No Azure SQL, atenção a uma armadilha: a opção *"Allow Azure services and
resources to access this server"* **não** cobre a Vercel — ela vale para
recursos dentro do Azure, e a Vercel não é um deles. Ligar aquilo achando que
resolveu é abrir o servidor para todo o Azure sem ganhar acesso nenhum.

### 3. Latência é por consulta

Cada consulta é uma ida e volta pela internet. Uma conexão nova custa mais:
handshake TLS + login TDS, vários round-trips antes da primeira linha. Por isso
duas coisas importam mais do que parecem — **a região** (função e banco no mesmo
lugar) e **o pool** (não abrir conexão a cada requisição).

---

## As três topologias

### A. Vercel → Azure SQL, direto  ← *é o que este repositório implementa*

O Azure SQL Database é SQL Server gerenciado: mesmo T-SQL, mesmo driver, TLS
obrigatório, endpoint público, backup automático.

- **A favor:** um deploy só. Nada de segunda aplicação para manter. É o caminho
  mais curto entre onde você está e um site com dados de verdade.
- **Contra:** o banco fica na internet. A defesa é credencial forte, TLS,
  usuário com permissão mínima e auditoria — não firewall.

### B. Vercel → SQL Server seu (VPS, máquina própria, contêiner)

- **A favor:** você já tem o servidor, e talvez os dados também.
- **Contra:** você vira DBA e SRE. Porta 1433 aberta na internet é varrida o dia
  inteiro, e o certificado precisa ser válido de verdade — autoassinado obriga
  `SQLSERVER_TRUST_SERVER_CERTIFICATE=true`, que desliga a única proteção contra
  alguém no meio do caminho. Nunca use o `sa`; crie login dedicado com permissão
  só no banco da aplicação.

### C. Vercel → API sua → SQL Server (banco em rede privada)

O site chama HTTPS; quem fala TDS com o banco é uma aplicação sua (ASP.NET Core,
Node, o que for), hospedada onde o banco está — Azure App Service, uma VM,
Railway, Render.

- **A favor:** o banco nunca aparece na internet. É a resposta quando existe
  política de segurança, dado sensível, ou um banco corporativo atrás de VPN.
- **Contra:** dois deploys, dois lugares para autenticar, uma camada a mais para
  manter em dia.

Se você for por aqui, o código deste repositório continua servindo:
`lib/store-sqlserver.ts` migra inteiro para dentro da API, e o `Store` do site
vira um cliente HTTP. O contrato — `lib/model.ts` — não muda, que é exatamente o
motivo de ele existir separado.

### Qual escolher

Comece por **A**. Vá para **C** se a política proibir expor o banco. **B** só se
você já tem o servidor e sabe mantê-lo — não é o caminho curto que parece ser.

---

## Pool de conexões: o que muda em serverless

Cada instância da função é um processo próprio, com o seu próprio pool. Isso
inverte a conta a que se está acostumado:

```
conexões pedidas ao servidor  =  instâncias ativas  ×  SQLSERVER_POOL_MAX
```

Vinte instâncias com pool de 10 são 200 conexões. O Azure SQL Basic aceita 300
no total; o excesso não vira fila, vira erro de login — e o erro aparece como
"o site caiu" no pico, que é o pior momento para descobrir isso.

O que o `lib/db.ts` faz por causa disso:

- `max: 4`, `min: 0`, ocioso devolvido em 30s. Instância parada não segura
  conexão que outra precisa.
- Pool no `globalThis`, guardando a **promessa** e não o pool pronto: duas
  requisições que chegam juntas numa instância fria compartilham a conexão em
  vez de abrirem duas.
- `pool.on('error')` limpa o cache — senão uma conexão que caiu deixaria uma
  promessa resolvida e inútil, e toda requisição seguinte falharia para sempre.
- Uma nova tentativa em erro transitório. O `40613` do Azure SQL é o caso
  concreto: no tier serverless o banco pausa sozinho sem uso, e a primeira
  conexão depois da pausa falha enquanto ele acorda.

Não use a conexão global do `mssql` (`sql.connect()` sem instanciar pool): ela é
um singleton de módulo que não sobrevive bem ao empacotamento do Next, onde
rotas e componentes de servidor viram bundles separados.

O **Fluid Compute**, hoje padrão na Vercel, ajuda de verdade aqui: uma instância
atende várias requisições concorrentes, então o pool é reaproveitado em vez de
ser aberto e jogado fora a cada chamada.

---

## Região e latência

Ponha a função na mesma região do banco. Um site servido de Washington
consultando um banco em São Paulo paga ~200 ms por consulta, e uma página com
três consultas em sequência já perdeu meio segundo antes de renderizar.

No `vercel.json`, para Azure SQL em `brazilsouth`:

```json
{ "regions": ["gru1"] }
```

(ou em Project Settings → Functions → Region). Confira a lista de regiões da
Vercel antes de fixar — e lembre que o CDN continua global; só a função muda.

---

## Segredos

Variáveis de ambiente em Project Settings → Environment Variables, marcadas como
**Sensitive**. Nunca no repositório: `.env.local` está no `.gitignore` e deve
continuar.

Use ambientes separados. *Preview* apontando para o banco de produção é como se
apaga dado de gente de verdade sem querer — e todo pull request abre um Preview.

---

## Como está implementado aqui

```
lib/model.ts            o modelo e o contrato `Store` — quem quiser trocar o
                        armazenamento cumpre esta interface e nada mais
lib/repository.ts       a porta única dos dados; escolhe banco ou memória
lib/db.ts               pool, consultas parametrizadas, erros do SQL Server
lib/store-sqlserver.ts  o armazenamento em SQL Server
lib/store-memory.ts     o armazenamento em memória, para desenvolver
db/001_schema.sql       tabelas, índices e restrições
db/002_seed_demo.sql    contas de demonstração — nunca em produção
scripts/migrate.mjs     `npm run db:migrate`
```

Rotas e páginas importam de `lib/repository.ts` e mais nada. A escolha do
armazenamento é **pela configuração**, não por `NODE_ENV`: com as quatro
variáveis `SQLSERVER_*` definidas, é o banco; sem elas, é a memória. Assim um
clone recém-feito roda com `npm run dev` sem provisionar nada, e a mesma build
que roda na Vercel roda apontada para um SQL Server local.

Duas garantias moram no esquema, e não no código, de propósito — verificar em
JavaScript não vale nada com duas requisições ao mesmo tempo:

- `UX_users_email` — não existem duas contas com o mesmo e-mail;
- `UX_orders_user_photo` — a licença é única por (usuário, foto). Pagar duas
  vezes pela mesma foto é impossível por construção, não por um `if`.

Toda consulta é parametrizada. Nenhum valor vindo do cliente entra concatenado
no texto do comando.

---

## Passo a passo — Azure SQL

**1. Criar servidor e banco.** Portal do Azure → SQL databases → Create. Anote o
nome do servidor (`<algo>.database.windows.net`). Para começar, o tier
*Serverless* (General Purpose) com auto-pause é o mais barato; saiba que a
primeira consulta depois da pausa demora alguns segundos — o `lib/db.ts` já
repete a tentativa por causa disso.

**2. Firewall.** Networking → Public access → Selected networks. Adicione o seu
IP para conseguir migrar da sua máquina. Para a Vercel, leia de novo a seção
"IP de saída" acima e decida conscientemente: liberar `0.0.0.0/0` é uma escolha
com consequência, não um passo de tutorial.

**3. Dois logins, não um.** O login da aplicação não pode criar nem apagar
tabela — se um dia ele vazar, a diferença entre "leram os dados" e "apagaram o
banco" é esta:

```sql
-- no banco master
CREATE LOGIN revela_app     WITH PASSWORD = '<senha longa e aleatória>';
CREATE LOGIN revela_migrate WITH PASSWORD = '<outra senha>';

-- no banco da aplicação
CREATE USER revela_app     FOR LOGIN revela_app;
CREATE USER revela_migrate FOR LOGIN revela_migrate;

-- a aplicação lê e escreve linha; não mexe em estrutura
ALTER ROLE db_datareader ADD MEMBER revela_app;
ALTER ROLE db_datawriter ADD MEMBER revela_app;

-- a migração mexe em estrutura
ALTER ROLE db_ddladmin   ADD MEMBER revela_migrate;
ALTER ROLE db_datareader ADD MEMBER revela_migrate;
ALTER ROLE db_datawriter ADD MEMBER revela_migrate;
```

**4. Migrar.** Em `.env.local`, com as credenciais de `revela_migrate`:

```bash
SQLSERVER_HOST=<servidor>.database.windows.net
SQLSERVER_DATABASE=revela
SQLSERVER_USER=revela_migrate
SQLSERVER_PASSWORD=...
```

```bash
npm run db:migrate            # só o esquema
npm run db:migrate -- --seed  # com as contas de demonstração (local!)
```

O script registra o que aplicou em `dbo.schema_migrations`; rodar de novo não
faz nada. No Azure SQL o usuário **não** leva o sufixo `@<servidor>` quando o
driver é o `tedious`.

**5. Publicar.** Na Vercel, as quatro variáveis com as credenciais de
`revela_app` (não as de migração), em Production e Preview. Redeploy — variável
de ambiente nova só vale no build seguinte.

**6. Conferir.** Faça login com uma conta de teste, compre uma foto, e confira
no banco:

```sql
SELECT TOP 10 * FROM dbo.orders ORDER BY created_at DESC;
```

Se a linha está lá, acabou: o site na Vercel está gravando no seu SQL Server.

---

## SQL Server local, para desenvolver

```bash
docker run -e 'ACCEPT_EULA=Y' -e 'MSSQL_SA_PASSWORD=Local@2026dev' \
  -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
```

```bash
# .env.local
SQLSERVER_HOST=localhost
SQLSERVER_DATABASE=revela
SQLSERVER_USER=sa
SQLSERVER_PASSWORD=Local@2026dev
SQLSERVER_TRUST_SERVER_CERTIFICATE=true   # certificado autoassinado do contêiner
```

O banco `revela` precisa existir antes (`CREATE DATABASE revela;`) — a migração
cria tabelas, não bancos. `sa` e `trustServerCertificate` aqui, **só** aqui.

---

## O que este documento não resolve

- **Rate limiting ainda é em memória** (`lib/rate-limit.ts`). Com várias
  instâncias, cada uma tem a sua contagem e o limite deixa de valer. Vai para
  Redis/Upstash ou para o gateway. É o furo mais próximo de virar problema.
- **Sessão não é revogável.** O token é assinado e válido até expirar; o logout
  só apaga o cookie. Revogar exige guardar a sessão do lado do servidor.
- **Fotos ainda não têm tabela.** O acervo vive em `lib/mock-photos.ts`, e por
  isso `orders.photo_id` é texto solto, sem chave estrangeira. Quando
  `dbo.photos` existir, as FKs entram numa migração nova.
- **Não há cobrança.** O pedido registra preço e versão da licença; falta o
  pagamento no meio.
- **Backup e restauração não estão testados.** Backup automático que nunca foi
  restaurado é backup que talvez não exista.

---

## Checklist antes de apontar a produção para o banco

- [ ] Login da aplicação sem permissão de DDL (dois logins, passo 3)
- [ ] `SQLSERVER_TRUST_SERVER_CERTIFICATE` ausente ou `false` em produção
- [ ] Região da função igual à do banco
- [ ] `SQLSERVER_POOL_MAX` conferido contra o limite de conexões do tier
- [ ] Preview e Production apontando para bancos **diferentes**
- [ ] Variáveis marcadas como Sensitive na Vercel
- [ ] `002_seed_demo.sql` **não** aplicado em produção
- [ ] `AUTH_SECRET` forte e distinto do de desenvolvimento
- [ ] Restauração de backup testada uma vez, de verdade
