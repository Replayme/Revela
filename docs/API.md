# Revela — contrato da API

Este documento é o que o back-end precisa implementar para que o site funcione
em produção: autenticação (§1–§10) e pedidos (§11). As rotas em `app/api/*`
deste projeto são um **mock** que já respeita este contrato (mesmos caminhos,
mesmos payloads, mesmos códigos), então dá para trocar o mock pelo serviço real
sem tocar em uma linha do front-end.

Base: `https://<dominio>/api/auth`
Content-Type de todas as requisições e respostas: `application/json`.

---

## 1. `POST /api/auth/login`

Autentica e abre a sessão.

**Request**

```json
{
  "email": "ana@revela.com",
  "password": "Revela@2026",
  "remember": true
}
```

| Campo      | Tipo    | Regra                                                     |
| ---------- | ------- | --------------------------------------------------------- |
| `email`    | string  | Obrigatório, formato de e-mail, no máximo 254 caracteres. |
| `password` | string  | Obrigatório, mínimo 6 caracteres.                          |
| `remember` | boolean | Opcional (padrão `false`). Define a duração da sessão.     |

**200 — sucesso**

```json
{
  "user": { "id": "usr_ana", "name": "Ana Ribeiro", "email": "ana@revela.com" },
  "redirectTo": "/dashboard"
}
```

Junto vai o cookie de sessão:

```
Set-Cookie: revela_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/;
            Max-Age=2592000   ← só quando remember = true
```

Sem `remember`, o cookie é de sessão (sem `Max-Age`): morre quando o navegador
fecha. Com `remember`, dura 30 dias.

**Erros**

| HTTP | `error`                | Quando                                    | Campos extras         |
| ---- | ---------------------- | ----------------------------------------- | --------------------- |
| 400  | `VALIDATION`           | Payload malformado ou fora das regras     | `fields`              |
| 401  | `INVALID_PASSWORD`     | E-mail existe, senha errada               | `attemptsLeft`        |
| 401  | `INVALID_CREDENTIALS`  | Modo sem enumeração (ver §7)              | `attemptsLeft`        |
| 403  | `ACCOUNT_DISABLED`     | Conta suspensa ou banida                  | —                     |
| 404  | `EMAIL_NOT_FOUND`      | Não existe conta com esse e-mail          | `attemptsLeft`        |
| 429  | `RATE_LIMITED`         | Estourou 5 tentativas em 15 min           | `retryAfterSeconds`   |
| 429  | `IP_BLOCKED`           | IP bloqueado por força bruta              | `retryAfterSeconds`   |
| 5xx  | qualquer               | Falha do servidor                         | —                     |

Respostas 429 devem trazer também o header `Retry-After` em segundos.

O front-end traduz cada código em `lib/i18n.ts` (chaves `error.*`). Códigos
desconhecidos caem em `error.UNKNOWN` — então o back-end pode adicionar novos
sem quebrar a tela.

---

## 2. `POST /api/auth/register`

Cria a conta do fotógrafo e já abre a sessão — obrigar a fazer login logo
depois de criar a conta é pedir a mesma senha duas vezes seguidas.

**Request**

```json
{
  "name": "Ana Vilar",
  "email": "ana@estudio.com",
  "password": "umaSenhaBoa1",
  "passwordConfirmation": "umaSenhaBoa1",
  "acceptedTerms": true
}
```

| Campo                  | Tipo    | Regra                                                        |
| ---------------------- | ------- | ------------------------------------------------------------ |
| `name`                 | string  | Obrigatório, 2 a 80 caracteres. É o crédito público da foto. |
| `email`                | string  | Obrigatório, formato de e-mail, no máximo 254 caracteres.    |
| `password`             | string  | Obrigatório, mínimo 6 caracteres.                             |
| `passwordConfirmation` | string  | Obrigatório, idêntico a `password`.                           |
| `acceptedTerms`        | boolean | Obrigatório, precisa ser `true`.                              |

O e-mail é normalizado (minúsculas, sem espaços nas pontas) antes de virar
chave. A unicidade tem que ser **índice único na coluna**, não uma consulta
antes do insert: entre a consulta e a escrita cabe outra requisição.

**201 — conta criada**

```json
{
  "user": { "id": "usr_9f2c…", "name": "Ana Vilar", "email": "ana@estudio.com" },
  "redirectTo": "/dashboard"
}
```

Junto vai o mesmo cookie de sessão do login, sem `remember` (12 horas):

```
Set-Cookie: revela_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/;
            Max-Age=43200
```

**202 — modo sem enumeração**

Quando `REVEAL_ACCOUNT_EXISTENCE` é `false` e o e-mail já tem conta, a resposta
é `{ "pending": true }` — a mesma que o endereço tivesse ou não conta. Quem já
tem conta recebe um aviso por e-mail em vez de uma conta nova. Ver §7.

**Erros**

| HTTP | `error`        | Quando                                        | Campos extras       |
| ---- | -------------- | --------------------------------------------- | ------------------- |
| 400  | `VALIDATION`   | Payload malformado ou fora das regras         | `fields`            |
| 409  | `EMAIL_TAKEN`  | E-mail já cadastrado (modo com enumeração)    | —                   |
| 429  | `RATE_LIMITED` | Estourou 5 tentativas em 15 min               | `retryAfterSeconds` |
| 429  | `IP_BLOCKED`   | IP bloqueado por força bruta                  | `retryAfterSeconds` |
| 5xx  | qualquer       | Falha do servidor                             | —                   |

`fields` traz uma chave por campo do request, com `"invalid"` ou `null` —
inclusive `acceptedTerms`.

O cadastro usa o **mesmo rate limit do login** (§8): criar conta escreve no
banco e dispara e-mail, então sem teto vira o endpoint mais barato de abusar.

**O que falta para produção**

- Confirmação de e-mail antes de publicar qualquer foto — hoje a conta já nasce
  ativa. O token de confirmação segue o mesmo desenho do de reset (§4): guardado
  como hash, com prazo e uso único.
- Registrar a versão dos termos aceita e a data do aceite, não só o booleano.

---

## 3. `POST /api/auth/forgot-password`

```json
{ "email": "ana@revela.com" }
```

**Responde 200 sempre**, exista a conta ou não:

```json
{ "ok": true }
```

Esta rota é a única em que não há escolha sobre enumeração: responder
"e-mail não encontrado" aqui entrega uma lista de clientes para quem pedir.
Quem tem conta descobre pelo e-mail que chega; quem não tem, não descobre nada.

Fora de produção o mock devolve também `devResetUrl` para dar para testar o
fluxo sem servidor de e-mail. **Nunca** devolva esse campo em produção.

O e-mail enviado contém `https://<dominio>/redefinir-senha?token=<token>`.

---

## 4. `POST /api/auth/reset-password`

```json
{
  "token": "<token do link>",
  "password": "novaSenha@2026",
  "confirmation": "novaSenha@2026"
}
```

**200:** `{ "ok": true }`

| HTTP | `error`         | Quando                                       |
| ---- | --------------- | -------------------------------------------- |
| 400  | `VALIDATION`    | Senha curta ou confirmação diferente         |
| 400  | `TOKEN_INVALID` | Token inexistente, já usado ou adulterado    |
| 400  | `TOKEN_EXPIRED` | Passou das 24 h                              |

Ao trocar a senha, o back-end deve **invalidar todas as sessões ativas** do
usuário e disparar um e-mail avisando da mudança — é assim que a pessoa
descobre um acesso indevido.

---

## 5. `POST /api/auth/logout`

Sem corpo. Responde 200 e devolve o cookie zerado (`Max-Age=0`). Se houver
refresh token no servidor, revogue-o aqui — apagar o cookie do navegador não
encerra nada do lado do servidor.

---

## 6. Armazenamento de senha

Nunca em texto plano, nunca com SHA-256 "puro" (rápido demais, quebra em
GPU). Use uma função de derivação com custo:

| Algoritmo    | Parâmetros mínimos                          |
| ------------ | ------------------------------------------- |
| **argon2id** | m = 19 MiB, t = 2, p = 1 — preferido        |
| bcrypt       | cost ≥ 12                                    |
| scrypt       | N = 2^17, r = 8, p = 1                       |

Regras que valem para qualquer um deles:

- salt aleatório por usuário, guardado junto do hash;
- comparação em tempo constante (`timingSafeEqual`), nunca `==`;
- ao verificar um e-mail inexistente, **execute mesmo assim** um hash falso
  antes de responder. Sem isso, o tempo de resposta denuncia quais e-mails
  existem, mesmo com a mensagem genérica;
- reidrate o hash (recalcule com parâmetros atuais) no próximo login bem
  sucedido quando o custo armazenado estiver defasado.

O `lib/password.ts` deste projeto usa scrypt com salt por usuário e comparação
em tempo constante — serve de referência, mas troque por argon2id em produção.
O formato guardado (`scrypt$<salt>$<hash>`) começa pelo nome do esquema
justamente para essa troca poder ser gradual, sem forçar ninguém a redefinir a
senha.

---

## 7. Enumeração de contas — uma decisão a tomar

A tela pede mensagens distintas: **"E-mail não encontrado"** e
**"Senha incorreta"**. Elas são melhores de usar — a pessoa sabe se errou o
e-mail ou a senha. O custo é que qualquer um pode testar endereços e montar a
lista de quem tem conta no Revela.

O mock controla isso pela variável `REVEAL_ACCOUNT_EXISTENCE`:

| Valor              | Comportamento                                                     |
| ------------------ | ----------------------------------------------------------------- |
| `true` (padrão)    | `EMAIL_NOT_FOUND` / `INVALID_PASSWORD` — mensagens distintas       |
| `false`            | `INVALID_CREDENTIALS` nos dois casos — "E-mail ou senha incorretos" |

Recomendação: distinto é aceitável enquanto o site vende para fotógrafos e a
lista de contas não é sensível. Se um dia houver conta de comprador com dados
de pagamento, mude para `false` — nesse ponto a lista de clientes vira
informação que vale a pena proteger. A troca é uma variável de ambiente, o
front-end já trata os dois códigos.

---

## 8. Rate limiting e força bruta

Duas camadas, ambas implementadas em `lib/rate-limit.ts`:

| Camada             | Chave            | Limite                | Punição                  |
| ------------------ | ---------------- | --------------------- | ------------------------ |
| Tentativa de login | IP + e-mail      | 5 falhas / 15 min     | 429 até a janela expirar |
| Força bruta        | IP               | 15 falhas / 15 min    | Bloqueio de 30 min       |

Detalhes que importam:

- **conte antes de verificar a senha** e responda 429 sem tocar no hash;
- login bem-sucedido zera o contador daquele par IP + e-mail;
- pedidos de redefinição de senha têm limite próprio, senão viram spam;
- **o estado não pode ficar na memória do processo.** Com duas instâncias,
  cada uma teria sua contagem e o limite de 5 viraria 10. Use Redis/Upstash
  (`INCR` + `EXPIRE`) ou o rate limiting do gateway (Cloudflare, nginx,
  API Gateway). O mock usa um `Map` em memória só porque é mock;
- o IP vem de `X-Forwarded-For` **apenas se o proxy for confiável e
  sobrescrever o header** — se ele for repassado do cliente, qualquer um
  escapa do limite trocando o valor;
- considere CAPTCHA (hCaptcha/Turnstile) a partir da terceira falha, em vez
  de bloquear direto: bloqueio por IP prejudica quem está atrás de NAT
  corporativo.

---

## 9. Sessão

O token vai em **cookie `HttpOnly`**, não em `localStorage`. Token em
`localStorage` é legível por qualquer script da página — uma falha de XSS
vira roubo de sessão. Com `HttpOnly`, o JavaScript não alcança o cookie.

```
HttpOnly    JavaScript não lê
Secure      só trafega em HTTPS
SameSite=Lax  corta CSRF na maioria dos casos
Path=/
```

Formato: JWT curto (15 min) + refresh token opaco guardado no servidor, ou
sessão opaca em Redis. JWT longo sem lista de revogação não dá para cancelar
antes de expirar — é o que dói no dia em que alguém precisa derrubar todas as
sessões de uma conta.

Assine com `jose` ou `jsonwebtoken`, chave em variável de ambiente
(`AUTH_SECRET`), com rotação prevista. O mock assina HMAC-SHA256 no mesmo
formato compacto de JWT.

Proteja as rotas privadas no `middleware.ts` além da checagem na página —
assim a validação acontece antes de qualquer render.

---

## 10. HTTPS

Obrigatório em produção, inclusive nos ambientes de homologação que recebem
senha real.

- redirecione 301 de HTTP para HTTPS na borda;
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  (já configurado em `next.config.mjs`);
- cookies sempre com `Secure`;
- sem HTTPS, a senha viaja legível em qualquer Wi-Fi no caminho.

---

## 11. Pedidos, licenças e entrega do arquivo

Estas três rotas fecham a transação: emitir a licença, listar o que a pessoa
tem e entregar o arquivo. Só a primeira já existia; as outras duas vieram com
o painel da conta.

### `POST /api/pedidos`

```json
{ "photoId": "p-03" }
```

**201 — licença emitida**

```json
{
  "order": {
    "id": "ord_3605a88d8302dea4",
    "userId": "usr_ana",
    "photoId": "p-03",
    "pricePaid": 120,
    "licenseVersion": "1.0",
    "createdAt": 1788429622096
  },
  "alreadyOwned": false
}
```

**200 — já era sua.** A licença é perpétua: comprar a mesma foto de novo
devolve o pedido existente com `alreadyOwned: true`, sem emitir outra nem
cobrar outra vez.

| HTTP | `error`           | Quando                          |
| ---- | ----------------- | ------------------------------- |
| 400  | `VALIDATION`      | Corpo malformado                |
| 401  | `UNAUTHENTICATED` | Sem sessão válida               |
| 404  | `PHOTO_NOT_FOUND` | `photoId` fora do acervo        |

Dois campos existem para não mudar o passado: `pricePaid` guarda o valor no
momento da compra, e `licenseVersion` a versão do texto aceito. Mexer na
tabela de preços ou reescrever a licença não pode alterar um pedido antigo.

**Falta o pagamento.** Hoje o pedido é registrado direto. O passo real é:
criar o pedido como `pending`, mandar para o provedor (Stripe, Pagar.me), e
só marcar `paid` — o que libera o download — no **webhook** de confirmação,
nunca no retorno do navegador, que a pessoa controla.

### `GET /api/pedidos/<id>/arquivo`

Entrega o arquivo de um pedido. Responde `307` para a URL do arquivo.

| HTTP | `error`           | Quando                                   |
| ---- | ----------------- | ---------------------------------------- |
| 401  | `UNAUTHENTICATED` | Sem sessão válida                        |
| 404  | `ORDER_NOT_FOUND` | Pedido inexistente **ou de outra pessoa** |
| 404  | `PHOTO_NOT_FOUND` | Pedido íntegro, foto fora do acervo      |

Três decisões que valem para a versão real:

- **o download passa pelo servidor.** Colocar a URL do arquivo direto no botão
  publica o endereço do original para quem abrir o código-fonte, tenha
  comprado ou não;
- **pedido de outra pessoa responde 404, não 403.** "Existe, mas não é seu" já
  entrega quantos pedidos o site tem;
- **em produção, URL assinada de vida curta** (minutos) para um bucket
  privado, com `Content-Disposition: attachment` e `Cache-Control: no-store`.
  A rota confere a posse a cada pedido e só então assina.

### `PATCH /api/fotos/<id>` — edita a ficha

Só o autor da foto. Corpo parcial: manda-se **apenas** o que mudou.

```jsonc
{ "title": "…", "category": "…", "price": 109.5, "status": "rascunho" }
```

| HTTP | `error` | Quando |
| ---- | ------- | ------ |
| 200  | —       | `{ "photo": { … } }` com a ficha já atualizada |
| 400  | `VALIDATION` | Campo malformado (`fields` diz qual), ou corpo sem nenhum campo |
| 401  | `UNAUTHENTICATED` | Sem sessão |
| 404  | `PHOTO_NOT_FOUND` | Foto inexistente **ou de outro autor** — ver §7 |

`status` é como **despublicar** acontece: `'rascunho'` tira da venda sem tirar
do acervo do autor. Mudar o preço **não altera pedido antigo** — `pricePaid`
mora no pedido justamente para isso.

A conferência de dono não é um `if` antes da gravação: o id do autor entra no
`WHERE` do UPDATE. Buscar, comparar e só então gravar deixa uma janela entre a
comparação e a escrita.

### `DELETE /api/fotos/<id>` — tira do acervo

| HTTP | `error` | Quando |
| ---- | ------- | ------ |
| 200  | —       | `{ "ok": true }` |
| 401  | `UNAUTHENTICATED` | Sem sessão |
| 404  | `PHOTO_NOT_FOUND` | Inexistente ou de outro autor |

**Não apaga a linha, e não toca nos pedidos.** Grava `removed_at`: a foto sai
da busca, do acervo e do painel, e quem já comprou continua com o recibo e com
o download. A venda também continua no histórico do autor. Ver docs/BANCO.md.

### `GET /api/minhas-fotos` — o painel de quem vende

Responde `{ photographer, photos }`. Conta que não é de autor recebe **200 com
o painel vazio** (`photographer: null`), não 404: ela existe e simplesmente não
publicou nada.

`photos[]` traz `status`, `sales` e `revenue` por foto. **Nunca traz quem
comprou** — ver o comentário em `vendasDoAutor`.

### `POST /api/fotos` — grava a ficha da foto enviada

**O arquivo não passa por aqui.** Uma função da Vercel recusa corpo acima de
~4,5 MB e o acervo aceita 25 MB: o navegador manda direto para o bucket,
autorizado por um token de curta duração, e esta rota recebe só o caminho de
onde o arquivo ficou.

```jsonc
{
  "title": "…", "category": "…", "price": 74.5,
  "width": 4000, "height": 2667,
  "thumbnailUrl": "https://…", "fullUrl": "https://…",
  "storageKey": "fotos/<id-do-autor>/<arquivo>"
}
```

| HTTP | `error` | Quando |
| ---- | ------- | ------ |
| 201  | —       | `{ "photo": { … } }` |
| 400  | `VALIDATION` | Campo malformado, ou `storageKey` fora do prefixo do autor |
| 401  | `UNAUTHENTICATED` | Sem sessão |
| 403  | `NOT_A_PHOTOGRAPHER` | A conta não é de autor: publicar não existe para ela |

Aqui todo campo é obrigatório — foto nova sem título ou sem medida não é um
registro pela metade, é um registro que não deveria existir. As medidas vêm do
cliente porque é lá que a imagem foi aberta; conferi-las não prova que batem
com o arquivo, mas impede que uma medida absurda entre no banco e a ficha passe
a mentir sobre o que se está comprando.

**A ordem é upload primeiro, registro depois.** Upload sem registro deixa um
arquivo órfão no bucket — lixo barato e limpável. A ordem contrária deixaria no
acervo uma foto apontando para arquivo inexistente: um quadro quebrado com
preço.

**`storageKey` vem do cliente, então é conferido** contra `fotos/<id-do-autor>/`,
que sai da sessão. Sem isso alguém registraria como sua a foto que outra pessoa
enviou.

A foto entra como `publicada`, não `em-analise`: não há curadoria, e uma fila
sem quem analise seria uma foto invisível para sempre. O padrão da coluna
continua `rascunho`, que é o valor seguro para quem inserir sem dizer nada.

### `POST /api/fotos/upload` — autoriza o navegador a enviar

Não recebe nem devolve arquivo: emite um token de curta duração que permite ao
navegador escrever **um caminho específico** no bucket.

| HTTP | `error` | Quando |
| ---- | ------- | ------ |
| 200  | —       | `{ clientToken }` para o `upload()` do `@vercel/blob/client` |
| 400  | `UPLOAD_REJECTED` | Caminho fora do prefixo do autor |
| 401  | `UNAUTHENTICATED` | Sem sessão |
| 403  | `NOT_A_PHOTOGRAPHER` | A conta não é de autor |
| 503  | `STORAGE_UNAVAILABLE` | Sem `BLOB_READ_WRITE_TOKEN` |

O token sai com o caminho fixado e mais dois limites, diferentes conforme o
prefixo:

| Prefixo | Tipos | Máximo |
| --- | --- | --- |
| `fotos/<autor>/` (original) | `image/jpeg`, `image/png` | 25 MB |
| `previews/<autor>/` (prévia) | `image/jpeg`, `image/webp` | 4 MB |

**O prefixo por autor é a fronteira entre autores dentro do bucket**, e sai da
sessão — nunca do corpo da requisição. É ele que impede alguém de escrever, ou
de registrar como sua, a foto de outra pessoa.

### Dois arquivos por foto, e por quê

O **original** vai como `private`: não tem URL pública, e só sai por
`GET /api/pedidos/<id>/arquivo`, que assina uma URL de 5 minutos. A **prévia**
vai como `public`, porque é ela que o acervo mostra para quem ainda não comprou.

A prévia é gerada **no navegador** (canvas, 1600px no lado maior, JPEG q82).
A alternativa era o `putImage` do SDK, que otimiza no servidor — foi descartada
porque exige autenticação OIDC além do token de leitura/escrita e é cobrada
como transformação de imagem, duas dependências a mais para um arquivo que é
só a vitrine.

**Limitação conhecida:** o token não consegue fixar `access`; quem escolhe
público ou privado é a chamada do cliente. Um autor que alterasse o próprio
código para enviar o original como público exporia **o próprio** arquivo — o
prefixo continua impedindo que ele alcance o de outra pessoa. Se isso passar a
importar, o caminho é conferir o `access` no registro e recusar.

### A ordem, e o que acontece se quebrar no meio

Prévia → original → `POST /api/fotos`. Se a última etapa falhar, ficam dois
arquivos órfãos no bucket, que são lixo barato e limpável; a ordem contrária
deixaria no acervo uma foto apontando para arquivo inexistente.

### `GET /api/fotos` — ainda não existe, e nasce paginado

A busca do acervo (`/explorar`) filtra e ordena **em memória**, sobre o array
de `lib/mock-photos.ts`. Com catorze fotos isso é honesto; com acervo real é
insustentável de duas maneiras — o cliente baixaria o catálogo inteiro para
mostrar vinte fotos, e a ordenação por preço mentiria, porque ordenaria só o
pedaço que veio.

Quando esta rota existir, ela nasce paginada. O front já está no formato: o
estado da busca mora na query string (`?termo=`, `?categoria=`, `?orientacao=`,
`?ordenar=`, `?precoMax=`), e `?pagina=` entra na mesma chave sem mexer no
resto.

```
GET /api/fotos?termo=praia&categoria=retrato&ordenar=preco-asc&pagina=2
```

```json
{
  "photos": [ /* … */ ],
  "page": 2,
  "perPage": 24,
  "total": 318
}
```

Duas coisas que precisam vir do servidor junto com a página:

- **a contagem total**, senão a tela não sabe dizer "318 fotos encontradas" —
  hoje ela conta o array que tem na mão;
- **a contagem por categoria**, que hoje sai de `lib/mock-categories.ts`
  (derivada do acervo em memória) e alimenta os números ao lado de cada filtro.
  No banco isso é um `GROUP BY`, e precisa respeitar os *outros* filtros ativos
  para não oferecer uma categoria que, combinada com o resto, não devolve nada.

Prefira cursor a `offset` para a paginação: em acervo que recebe foto nova o
tempo todo, `offset` repete e pula itens entre uma página e a seguinte.

### `GET /api/pedidos` — ainda não existe

O painel (`/dashboard`) lê os pedidos direto do "banco" porque é um componente
de servidor no mesmo processo. Quando o back-end sair daqui, esta rota é a que
ele precisa expor: os pedidos da sessão, mais recentes primeiro, paginados.

---

## 12. Checklist antes de ir ao ar

- [x] Trocar o armazenamento em memória por banco real — Postgres (Neon), em
      `lib/store-postgres.ts` (ver docs/BANCO.md)
- [ ] Trocar o scrypt de `lib/password.ts` por argon2id
- [ ] Rate limiting em Redis ou no gateway, não em memória
- [ ] `AUTH_SECRET` forte e fora do repositório
- [ ] `Secure` nos cookies e HSTS ativo
- [ ] E-mail transacional de redefinição configurado (com SPF/DKIM/DMARC)
- [ ] `devResetUrl` nunca sai em produção
- [ ] Log de tentativas de login (IP, user agent, resultado) sem gravar a senha
- [ ] Alerta por e-mail em login de dispositivo novo e em troca de senha
- [ ] Decidir §7 (enumeração) e registrar a decisão
- [ ] `middleware.ts` protegendo `/dashboard`, `/pedido/*` e a rota do arquivo
- [ ] Pagamento antes de liberar o download, confirmado por webhook (§11)
- [ ] Arquivo em bucket privado, entregue por URL assinada de vida curta (§11)
- [ ] Testar com teclado e leitor de tela: foco visível, erros anunciados
