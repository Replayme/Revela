import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { Pool } from 'pg';

/**
 * Conexão com o Postgres (Neon).
 *
 * ## Por que não há pool aqui
 *
 * O driver da Neon usado abaixo fala com o banco por **HTTPS**, não por
 * soquete TCP: cada consulta é uma requisição, sem sessão, sem handshake de
 * conexão para amortizar. Isso apaga o problema mais chato de banco em
 * serverless — cada instância da função ter o seu próprio pool, e o total de
 * conexões pedidas ao servidor ser `instâncias × pool_max`. Não existe pool
 * para dimensionar, não existe conexão ociosa para devolver, e uma instância
 * fria não paga login nenhum antes da primeira linha.
 *
 * O preço é que não dá para abrir uma transação interativa (`BEGIN`, decidir
 * no meio, `COMMIT`). Nada aqui precisa: toda operação do repositório é um
 * comando só, e onde seria preciso mais de um passo o Postgres resolve numa
 * consulta com CTE — ver `toggleFavorite` em `lib/store-postgres.ts`. No dia
 * em que aparecer algo genuinamente interativo (cobrança, provavelmente), o
 * mesmo pacote exporta `Pool`, compatível com `pg`, por WebSocket.
 *
 * ## Dois clientes, um contrato
 *
 * O driver HTTP só fala com o endpoint da Neon. Para um Postgres comum — o
 * contêiner de quem está desenvolvendo, um servidor próprio — ele não serve, e
 * é o `pg` que entra, por TCP. Qual dos dois é decidido pelo host da URL, e
 * `query()` esconde a diferença: `store-postgres.ts` não sabe qual está
 * atendendo, e é o mesmo SQL nos dois.
 *
 * Isso também é o que torna as consultas testáveis contra um Postgres de
 * verdade sem depender de rede.
 *
 * ## Runtime
 *
 * Pelo caminho da Neon, sendo HTTPS, isto funcionaria até no runtime de edge —
 * inclusive dentro do `middleware.ts`, que hoje não consulta o banco. As rotas
 * continuam em `runtime = 'nodejs'` porque o hash de senha usa `node:crypto`,
 * não por causa do banco. Pelo caminho do `pg` o runtime Node é obrigatório:
 * lá existe soquete TCP.
 */

/**
 * A URL de conexão.
 *
 * `DATABASE_URL` é o nome que a integração Neon ↔ Vercel injeta no projeto;
 * `POSTGRES_URL` é o nome antigo, herdado do Vercel Postgres, e está aqui só
 * para quem tiver um projeto da época. A URL "pooled" e a "unpooled" servem
 * igual: sem pool do lado de cá, o PgBouncer da Neon não muda nada.
 */
function connectionString(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/**
 * Há banco configurado?
 *
 * Sem a URL, o site cai no armazenamento em memória (ver `lib/repository.ts`).
 * É de propósito que o critério seja a configuração e não `NODE_ENV`: quem
 * clona o repositório para mexer numa tela roda `npm run dev` e o site
 * funciona sem provisionar nada.
 */
export function isDatabaseConfigured(): boolean {
  return connectionString() !== undefined;
}

/**
 * O cliente fica no `globalThis` pelo mesmo motivo que o store em memória:
 * rotas e componentes de servidor são empacotados separadamente, e cada bundle
 * carregaria a sua cópia deste módulo. Aqui isso custaria pouco — o cliente é
 * só uma função com a URL dentro, não uma conexão — mas manter o padrão evita
 * a pergunta.
 */
const globalClient = globalThis as typeof globalThis & {
  __revelaSql?: NeonQueryFunction<false, false>;
  __revelaPgPool?: Pool;
};

function urlObrigatoria(): string {
  const url = connectionString();
  if (!url) {
    throw new Error(
      'Banco não configurado: defina DATABASE_URL. Ver docs/BANCO.md.',
    );
  }
  return url;
}

/**
 * O endpoint HTTP é da Neon; qualquer outro host é Postgres comum.
 *
 * Pelo host, e não por uma variável a mais: uma configuração que precisa ser
 * dita duas vezes é uma configuração que um dia se contradiz. `DATABASE_URL`
 * já sabe com quem está falando.
 */
function ehNeon(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
}

function clienteNeon(): NeonQueryFunction<false, false> {
  return (globalClient.__revelaSql ??= neon(urlObrigatoria()));
}

/**
 * Pool do `pg`, para Postgres comum.
 *
 * Pequeno pelo mesmo motivo que qualquer pool em serverless: cada instância da
 * função é um processo com o seu próprio, e o total pedido ao servidor é
 * `instâncias × max`. Este caminho é o de desenvolvimento e o de quem hospeda
 * o próprio banco; pela Neon não há pool nenhum.
 */
function poolPg(): Pool {
  return (globalClient.__revelaPgPool ??= new Pool({
    connectionString: urlObrigatoria(),
    max: 4,
    idleTimeoutMillis: 30_000,
    // Um erro no pool sem ouvinte derruba o processo inteiro.
  }).on('error', () => {
    delete globalClient.__revelaPgPool;
  }));
}

/* ------------------------------- consultas ------------------------------- */

/**
 * Consulta parametrizada. **Nunca** monte SQL concatenando valor.
 *
 * Todo valor que vem do cliente entra como `$1`, `$2`…; o driver o envia
 * separado do texto do comando, e o servidor nunca o interpreta como código.
 * É o que fecha a porta de injeção — e não a validação da entrada, que é outra
 * camada, para outro problema.
 *
 * Um comando por chamada: o protocolo estendido do Postgres não aceita vários
 * separados por `;` numa consulta parametrizada. Onde seria preciso mais de um
 * passo, use CTE.
 */
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = urlObrigatoria();
  if (ehNeon(url)) return (await clienteNeon().query(text, params)) as T[];
  return (await poolPg().query(text, params)).rows as T[];
}

/** A primeira linha, ou `undefined`. */
export async function queryOne<T>(
  text: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  return (await query<T>(text, params))[0];
}
