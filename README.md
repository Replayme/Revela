# Revela — página de login

Front-end completo da autenticação do Revela (marketplace de fotógrafos), em
Next.js 16 (App Router) + Tailwind 4 + TypeScript.

```bash
npm install
npm run dev     # http://localhost:3000/login
```

Contas de demonstração:

| E-mail                   | Senha            | Serve para                  |
| ------------------------ | ---------------- | --------------------------- |
| `ana@revela.com`         | `Revela@2026`    | Login bem-sucedido          |
| `bruno@revela.com`       | `contatoBruno1`  | Testar bloqueio por tentativas |
| `desativada@revela.com`  | `qualquercoisa1` | Erro `ACCOUNT_DISABLED`     |

---

## O que existe aqui

| Rota                | O que é                                                     |
| ------------------- | ----------------------------------------------------------- |
| `/login`            | **A entrega.** Login com validação, estados e i18n.          |
| `/cadastro-fotografo` | Criação de conta; já abre a sessão e leva ao painel.       |
| `/esqueci-senha`    | Pedido de redefinição.                                       |
| `/redefinir-senha`  | Nova senha via token (24 h, uso único).                      |
| `/dashboard`        | Painel da conta: as licenças compradas. Rota protegida.      |
| `/pedido/{id}`      | Recibo de um pedido: dados da compra, licença aceita, arquivo.|
| `/`                 | Home: destaques, categorias, fotógrafos e seção de valor.    |
| `/explorar`         | O acervo: busca, filtros e ordenação. Estado na URL.         |
| `/foto/{id}`        | Página da foto, com a compra.                                |
| `/api/auth/*`       | **Mock** das rotas — implementa `docs/API.md` para os testes.|
| `/api/pedidos/*`    | **Mock** da compra e da entrega do arquivo (`docs/API.md` §11).|
| `/api/favoritos`    | Fotos salvas por quem está logado.                           |

O back-end real está especificado em [`docs/API.md`](docs/API.md): endpoints,
payloads, códigos de erro, hash de senha, sessão, rate limiting, HTTPS e a
entrega do arquivo comprado.

**O que a compra faz e o que não faz.** Comprar emite a licença, registra o
pedido com o preço pago e a versão do texto aceito, e libera o download em
`/api/pedidos/{id}/arquivo` — que confere a posse a cada pedido, em vez de
deixar a URL do original na página. **Não há cobrança no meio**: o passo de
pagamento é o que falta, e `docs/API.md` §11 diz onde ele entra (pedido
`pending` → webhook do provedor → `paid` → download liberado).

---

## Sistema visual

Cianotipia e papel de laboratório.

| Token                | Valor     | Uso                                          |
| -------------------- | --------- | -------------------------------------------- |
| `--color-prussia-800`| `#132B40` | Estrutura, fundo, texto sobre papel           |
| `--color-paper`      | `#E9EBE6` | Superfície de leitura                         |
| `--color-amber`      | `#E0A32E` | **Só ações.** Nunca decoração.                |

- Título em serifa editorial (Fraunces), interface em sans (Inter). Fontes
  auto-hospedadas via npm — nenhuma requisição sai para o Google Fonts.
- Header de duas faixas: busca em largura total, navegação numa linha fina.
- Blocos são fotogramas com perfuração lateral (`components/film-frame.tsx`),
  cantos vivos. Nenhum card arredondado.

Três decisões que valem explicação:

**A busca aparece contida nas telas de acesso** (`<SiteHeader variant="auth">`).
A busca é o elemento mais pesado do site, mas numa página cujo trabalho é
autenticar, o formulário precisa ganhar dela — senão a página não sabe o que
está pedindo. A estrutura de duas faixas continua idêntica.

**O header sabe quem está logado, e por isso o site é todo dinâmico.** A
sessão é lida no `app/layout.tsx` e desce por contexto (`session-provider.tsx`)
até o header — inclusive nas páginas de cliente, como a home, que não têm como
ler o cookie. Ler cookie no layout desliga a geração estática do site inteiro:
é uma troca consciente enquanto o acervo é um array em memória. Quando ele
virar banco, o header sai do layout para um componente próprio em `Suspense` e
as páginas públicas voltam a ser estáticas.

**Os números do painel lateral são placeholders** (2.400 fotógrafos, 910 mil
fotos, 85% de repasse). Troque pelos reais em `components/auth-shell.tsx`
antes de publicar.

---

## O que a página faz

**Validação em tempo real** — o erro só aparece depois que a pessoa sai do
campo (ou tenta enviar). E-mail: vazio, formato inválido, válido (✓ verde).
Senha: vazia, menos de 6 caracteres, e medidor de força em três níveis
(letras + números + símbolos, `lib/validation.ts`). As mesmas funções rodam no
servidor — validação de cliente é UX, não segurança.

**Estados** — carregando (botão com spinner, barra de revelação, campos
desabilitados), erro do servidor (alerta com tremida curta), bloqueio
(contagem regressiva no botão, que se destrava sozinho), sucesso
(confirmação e redirecionamento para `/dashboard`).

**Mensagens de erro** por código, traduzidas em `lib/i18n.ts`: e-mail não
encontrado, senha incorreta, muitas tentativas (com os minutos restantes),
conta desativada, link expirado, falha de conexão. Código desconhecido cai
numa mensagem genérica, então o back-end pode adicionar novos sem quebrar a tela.

**Acessibilidade** — `aria-invalid`, `aria-describedby`, `role="alert"` nos
erros, `aria-busy` no envio, foco movido para o campo que precisa de correção,
força da senha anunciada em `aria-live`, foco visível em âmbar, e o espaço da
mensagem já reservado para o layout não pular. Respeita
`prefers-reduced-motion`.

**Responsivo** — uma coluna no celular com o formulário primeiro, duas colunas
a partir de `lg`. Inputs a 16px, que é o que evita o zoom automático do iOS.

**Idioma** — português e inglês, alternador PT/EN no header, preferência
guardada em `localStorage`.

A detecção pelo idioma do navegador foi **desligada de propósito**: só o header
e as telas de acesso estão traduzidos, e o resto do site (acervo, foto, perfil,
painel, recibo, licença) é texto fixo em português. Detectar `en` entregava, a
qualquer visitante de navegador em inglês, um header em inglês sobre um site em
português — sem que ninguém tivesse pedido. São quatro linhas em
`components/locale-provider.tsx` para religar quando o conteúdo estiver
traduzido.

---

## Segurança já implementada no mock

| Item                          | Onde                                  |
| ----------------------------- | ------------------------------------- |
| Senha com hash + salt         | `lib/password.ts` (scrypt)            |
| Comparação em tempo constante | `lib/password.ts`                     |
| Rate limit 5 / 15 min         | `lib/rate-limit.ts`                   |
| Bloqueio de IP por força bruta| `lib/rate-limit.ts` (15 falhas → 30 min) |
| Sessão em cookie `HttpOnly`   | `app/api/auth/login/route.ts`         |
| Token de reset com hash, 24 h, uso único | `lib/tokens.ts` + `password_reset_tokens` |
| HSTS e cabeçalhos de segurança| `next.config.mjs`                     |
| `method="post"` nos formulários | evita a senha ir parar na URL se o JS ainda não hidratou |

**Rate limit em memória continua sendo mock**: não sobrevive a duas
instâncias, e na Vercel são muitas. `docs/API.md` §8 diz o que trocar.

O armazenamento já não é: com `DATABASE_URL` definida, os dados vão para o
Postgres (`docs/BANCO.md`). Sem ela, o site cai na memória do processo — bom
para desenvolver, inútil em produção.

---

## O que ainda destoa

**A home tem header próprio.** Ela usa `app/page.module.css` (faixa clara, busca
com botão sólido); todo o resto usa `components/site-header.tsx` (faixa escura
de duas linhas). Os dois já sabem quem está logado e apontam para as mesmas
rotas, mas são dois componentes. Unificar é uma decisão de desenho — a home
clara funciona como abertura, e escurecê-la muda o tom da primeira tela.

**Nenhum número de vaidade na tela.** Os painéis da home e das telas de acesso
traziam seis números inventados — e dois deles se contradiziam ("0% de
comissão" contra "85% de repasse"). Foram trocados por afirmações que o código
sustenta: a licença única, a perpetuidade dela e a política de comissão. Se um
dia houver número medido, ele volta para `app/page.tsx` e
`components/auth-shell.tsx`.

**Só o header e as telas de acesso estão traduzidos.** Ver a nota sobre idioma
acima.

---

## Variáveis de ambiente

```bash
AUTH_SECRET=                    # obrigatório em produção: chave de assinatura da sessão
REVEAL_ACCOUNT_EXISTENCE=true   # false = "E-mail ou senha incorretos" nos dois casos

# Postgres (Neon). Sem ela, o site usa a memória do processo.
# Na Vercel a integração do Neon cria esta variável sozinha.
# Ver docs/BANCO.md e .env.example.
DATABASE_URL=
```

Sobre `REVEAL_ACCOUNT_EXISTENCE`: mensagens distintas são melhores de usar e
foi assim que a tela foi pedida, mas permitem descobrir quais e-mails têm
conta no site. `docs/API.md` §7 explica quando vale a pena mudar.

---

## Banco de dados

O armazenamento é Postgres, servido pelo Neon. Preencha `DATABASE_URL` e
aplique o esquema:

```bash
npm run db:migrate            # tabelas, índices e restrições
npm run db:migrate -- --seed  # + contas de demonstração (nunca em produção)
```

Sem essa variável o site usa um armazenamento em memória, que some a cada
restart — serve para desenvolver, não para publicar.

O driver fala com o banco por HTTPS, não por soquete TCP: **não há pool de
conexões para dimensionar**, que é o problema clássico de banco em serverless.
Cada Preview Deployment ganha um branch próprio do banco, criado e destruído
pela integração — nenhum pull request escreve na base de produção.

**`docs/BANCO.md`** explica a escolha: por que Neon e não SQL Server, o que
muda em serverless, o passo a passo da integração e o que fazer para
desenvolver com um Postgres local.

---

## Estrutura

```
app/
  not-found.tsx       404 no sistema visual, com saída para o acervo
  error.tsx           boundary de erro — nunca mostra a mensagem crua
  icon.svg            favicon              sitemap.ts / robots.ts
  login/              esqueci-senha/      redefinir-senha/
  dashboard/          painel da conta: as licenças compradas
  pedido/[id]/        recibo de um pedido
  foto/[id]/          página da foto, com a compra
  api/auth/{login,register,forgot-password,reset-password,logout}/
  api/pedidos/        compra e entrega do arquivo
  api/fotos/[id]/     PATCH edita e despublica · DELETE tira do acervo
  api/minhas-fotos/   o painel de quem vende
  globals.css         tokens, texturas e animações
components/
  auth-shell.tsx      moldura das telas de acesso
  site-header.tsx     header de duas faixas
  site-footer.tsx     rodapé do site — só links que existem
  archive-search.tsx  a busca do acervo: filtros, ordenação, estado na URL
  session-provider.tsx  a sessão do servidor no cliente (só identidade)
  film-frame.tsx      fotograma com perfuração
  buy-button.tsx      compra, estados e caminho para o arquivo
  form.tsx            campos, checkbox, alerta, botão, medidor de força
  locale-provider.tsx i18n no cliente
middleware.ts         barreira das rotas privadas, antes do render
lib/
  site.ts             o endereço público, num lugar só (OG, sitemap, robots)
  session-cookie.ts   o nome do cookie — sem dependência, para o edge
  validation.ts       regras compartilhadas cliente/servidor
  rate-limit.ts       limites e bloqueio
  session.ts          leitura do cookie de sessão, num lugar só
  license.ts          o texto da licença e o histórico de versões
  password.ts         hash de senha (scrypt) e comparação em tempo constante
  tokens.ts           token de sessão e token de reset, assinados
  model.ts            o modelo de dados e o contrato de armazenamento
  repository.ts       a porta única dos dados — escolhe banco ou memória
  db.ts               os dois clientes do Postgres, consultas parametrizadas
  store-postgres.ts   o armazenamento em Postgres
  store-memory.ts     o armazenamento em memória, para desenvolver
  seed-catalog.ts     o acervo de demonstração, para o store em memória
  photographer-panel.ts       o contrato do painel de quem vende
  photographer-panel-data.ts  o painel, montado a partir do banco
  photo-validation.ts as regras da ficha da foto, no servidor
  slug.ts             "Arquitetura e imóveis" → "arquitetura-e-imoveis"
  i18n.ts             pt / en
db/
  001_schema.sql      contas, tokens, pedidos e favoritos
  002_seed_demo.sql   contas de demonstração (nunca em produção)
  003_catalogo.sql    autores, fotos e o vínculo conta↔autor
  004_seed_demo_catalogo.sql  acervo de demonstração (nunca em produção)
scripts/migrate.mjs   aplicador de migrações — `npm run db:migrate`
docs/API.md           contrato do back-end
docs/BANCO.md         o banco: escolha, esquema e operação
```
