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
| `/esqueci-senha`    | Pedido de redefinição.                                       |
| `/redefinir-senha`  | Nova senha via token (24 h, uso único).                      |
| `/dashboard`        | Destino do redirecionamento; exemplo de rota protegida.      |
| `/`                 | Home mínima, só para mostrar o header no peso cheio.         |
| `/api/auth/*`       | **Mock** das rotas — implementa `docs/API.md` para os testes.|

O back-end real está especificado em [`docs/API.md`](docs/API.md): endpoints,
payloads, códigos de erro, hash de senha, sessão, rate limiting e HTTPS.

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

Duas decisões que valem explicação:

**A busca aparece contida nas telas de acesso** (`<SiteHeader variant="auth">`).
A busca é o elemento mais pesado do site, mas numa página cujo trabalho é
autenticar, o formulário precisa ganhar dela — senão a página não sabe o que
está pedindo. A estrutura de duas faixas continua idêntica.

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
guardada em `localStorage` e detecção pelo idioma do navegador.

---

## Segurança já implementada no mock

| Item                          | Onde                                  |
| ----------------------------- | ------------------------------------- |
| Senha com hash + salt         | `lib/mock-db.ts` (scrypt)             |
| Comparação em tempo constante | `lib/mock-db.ts`                      |
| Rate limit 5 / 15 min         | `lib/rate-limit.ts`                   |
| Bloqueio de IP por força bruta| `lib/rate-limit.ts` (15 falhas → 30 min) |
| Sessão em cookie `HttpOnly`   | `app/api/auth/login/route.ts`         |
| Token de reset com hash, 24 h, uso único | `lib/mock-db.ts`           |
| HSTS e cabeçalhos de segurança| `next.config.mjs`                     |
| `method="post"` nos formulários | evita a senha ir parar na URL se o JS ainda não hidratou |

**O mock é mock.** Rate limit em memória não sobrevive a duas instâncias, e o
"banco" some a cada restart. `docs/API.md` §7 e §10 dizem o que trocar.

---

## Variáveis de ambiente

```bash
AUTH_SECRET=                    # obrigatório em produção: chave de assinatura da sessão
REVEAL_ACCOUNT_EXISTENCE=true   # false = "E-mail ou senha incorretos" nos dois casos
```

Sobre `REVEAL_ACCOUNT_EXISTENCE`: mensagens distintas são melhores de usar e
foi assim que a tela foi pedida, mas permitem descobrir quais e-mails têm
conta no site. `docs/API.md` §6 explica quando vale a pena mudar.

---

## Estrutura

```
app/
  login/              esqueci-senha/      redefinir-senha/
  dashboard/          api/auth/{login,forgot-password,reset-password,logout}/
  globals.css         tokens, texturas e animações
components/
  auth-shell.tsx      moldura das telas de acesso
  site-header.tsx     header de duas faixas
  film-frame.tsx      fotograma com perfuração
  form.tsx            campos, checkbox, alerta, botão, medidor de força
  locale-provider.tsx i18n no cliente
lib/
  validation.ts       regras compartilhadas cliente/servidor
  rate-limit.ts       limites e bloqueio
  mock-db.ts          usuários, hashes, tokens, sessão
  i18n.ts             pt / en
docs/API.md           contrato do back-end
```
