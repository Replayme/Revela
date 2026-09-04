import sql from 'mssql';

/**
 * Conexão com o SQL Server.
 *
 * ## Por que isto funciona na Vercel
 *
 * A Vercel não "suporta" nem "deixa de suportar" um banco: ela roda funções
 * Node.js, e o que dá para alcançar dali é o que a rede alcança. O driver
 * `mssql` fala TDS por cima de `node:net`/`node:tls` através do `tedious`, que
 * é JavaScript puro — sem binário nativo, sem ODBC, sem `msnodesqlv8`. Nada
 * disso precisa de suporte especial da plataforma.
 *
 * O que **não** funciona é o runtime de edge: lá não existe soquete TCP cru,
 * só `fetch`. Por isso toda rota que chega até aqui declara
 * `export const runtime = 'nodejs'`, e por isso o `middleware.ts` — que roda
 * em edge — não consulta o banco (ver o comentário lá).
 *
 * ## O pool, e por que ele é pequeno
 *
 * Cada instância da função tem o seu próprio processo e, portanto, o seu
 * próprio pool. Vinte instâncias com pool de 10 são 200 conexões pedidas a um
 * servidor que, no Azure SQL Basic, aceita 300 no total — e o excesso não vira
 * fila, vira erro de login. O padrão daqui é 4, e `min: 0` para que uma
 * instância ociosa não segure conexão que outra precisa.
 *
 * O pool fica no `globalThis` pelo mesmo motivo que o store em memória ficava:
 * rotas e componentes de servidor são empacotados separadamente, e cada bundle
 * carregaria a sua cópia deste módulo — ou seja, o seu próprio pool. Guardamos
 * a *promessa*, não o pool pronto: duas requisições que chegam juntas na
 * instância fria compartilham a mesma conexão em vez de abrirem duas.
 */

const CONNECT_RETRY_DELAY_MS = 1_500;

/**
 * Erros que valem uma segunda tentativa.
 *
 * `40613` é o "Database is not currently available" do Azure SQL: no tier
 * serverless o banco pausa sozinho depois de um tempo sem uso, e a primeira
 * conexão depois da pausa falha enquanto ele acorda. Repetir uma vez cobre
 * exatamente esse caso; repetir sempre esconderia senha errada.
 */
const TRANSIENT = new Set(['ETIMEOUT', 'ESOCKET', 'ECONNCLOSED', 'ECONNRESET']);
const TRANSIENT_SQL_NUMBERS = new Set([40613, 40197, 40501, 49918, 49919, 49920]);

function isTransient(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code;
  const number = (error as { number?: number }).number;
  const original = (error as { originalError?: { number?: number } }).originalError;
  return (
    (code !== undefined && TRANSIENT.has(code)) ||
    (number !== undefined && TRANSIENT_SQL_NUMBERS.has(number)) ||
    (original?.number !== undefined && TRANSIENT_SQL_NUMBERS.has(original.number))
  );
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw !== 'false' && raw !== '0';
}

/**
 * Há banco configurado?
 *
 * Quatro variáveis, todas obrigatórias: sem qualquer uma delas o site cai no
 * armazenamento em memória (ver `lib/repository.ts`). É de propósito que o
 * critério seja "as quatro" e não "alguma" — meia configuração é engano de
 * deploy, e falhar no `npm run dev` de quem só quer mexer no CSS seria pior.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.SQLSERVER_HOST &&
      process.env.SQLSERVER_DATABASE &&
      process.env.SQLSERVER_USER &&
      process.env.SQLSERVER_PASSWORD,
  );
}

function buildConfig(): sql.config {
  return {
    server: process.env.SQLSERVER_HOST!,
    port: envNumber('SQLSERVER_PORT', 1433),
    database: process.env.SQLSERVER_DATABASE!,
    user: process.env.SQLSERVER_USER!,
    password: process.env.SQLSERVER_PASSWORD!,
    pool: {
      max: envNumber('SQLSERVER_POOL_MAX', 4),
      min: 0,
      // Uma instância que ficou ociosa devolve a conexão em 30s. Em serverless
      // isso importa mais do que economizar o handshake: a instância pode ficar
      // parada minutos antes de ser reciclada, segurando conexão à toa.
      idleTimeoutMillis: envNumber('SQLSERVER_POOL_IDLE_MS', 30_000),
    },
    options: {
      // TLS ligado sempre. O Azure SQL exige; num servidor próprio, sem isto a
      // senha do banco trafega pela internet aberta.
      encrypt: envBoolean('SQLSERVER_ENCRYPT', true),
      // Só ligue em servidor de desenvolvimento com certificado autoassinado.
      // Ligado em produção, o TLS deixa de proteger contra intermediário: a
      // conexão continua cifrada, mas com quem quer que atenda no caminho.
      trustServerCertificate: envBoolean('SQLSERVER_TRUST_SERVER_CERTIFICATE', false),
      // Datas gravadas e lidas em UTC. Sem isto, `tedious` interpreta
      // DATETIME2 no fuso do processo — e o fuso de uma função na Vercel não é
      // o do seu servidor. O repositório converte para epoch ms na saída.
      useUTC: true,
      // Erro no meio de uma transação a desfaz inteira em vez de deixar o
      // resto do lote rodar sobre um estado pela metade.
      abortTransactionOnError: true,
      // O `mssql` faz `SELECT @@VERSION` e afins na abertura; num banco que
      // acabou de acordar isso é lento, não travado.
      connectTimeout: envNumber('SQLSERVER_CONNECT_TIMEOUT_MS', 15_000),
      requestTimeout: envNumber('SQLSERVER_REQUEST_TIMEOUT_MS', 15_000),
    },
  };
}

const globalPool = globalThis as typeof globalThis & {
  __revelaPool?: Promise<sql.ConnectionPool>;
};

function novoPool(): sql.ConnectionPool {
  const pool = new sql.ConnectionPool(buildConfig());

  // Um erro no pool depois de conectado (a conexão caiu, o banco reiniciou)
  // não pode deixar uma promessa resolvida e inútil no `globalThis`: a próxima
  // requisição reabriria a conexão a partir dela e falharia para sempre.
  //
  // Sem este ouvinte o `mssql` emite 'error' sem quem escute, e um EventEmitter
  // sem ouvinte de 'error' derruba o processo inteiro.
  pool.on('error', () => {
    if (globalPool.__revelaPool) delete globalPool.__revelaPool;
  });

  return pool;
}

async function connect(): Promise<sql.ConnectionPool> {
  const pool = novoPool();

  try {
    return await pool.connect();
  } catch (error) {
    await pool.close().catch(() => {});
    if (!isTransient(error)) throw error;

    await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
    return novoPool().connect();
  }
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'SQL Server não configurado: defina SQLSERVER_HOST, SQLSERVER_DATABASE, ' +
        'SQLSERVER_USER e SQLSERVER_PASSWORD. Ver docs/BANCO.md.',
    );
  }

  if (!globalPool.__revelaPool) {
    globalPool.__revelaPool = connect().catch((error) => {
      // Falhou ao abrir: some com a promessa rejeitada para que a próxima
      // requisição tente de novo, em vez de herdar esta rejeição.
      delete globalPool.__revelaPool;
      throw error;
    });
  }

  return globalPool.__revelaPool;
}

/* ------------------------------- consultas ------------------------------- */

/**
 * Um parâmetro com tipo declarado à mão.
 *
 * O `mssql` adivinha o tipo pelo valor de JavaScript, e adivinha bem para
 * texto e inteiro. Erra onde importa: `39.9` vira `Float`, e preço em ponto
 * flutuante é como se perde centavo. Use `money()` e `at()` nesses casos.
 */
interface TypedParam {
  readonly __typed: true;
  readonly type: sql.ISqlType;
  readonly value: unknown;
}

function typed(type: sql.ISqlType, value: unknown): TypedParam {
  return { __typed: true, type, value };
}

function isTyped(value: unknown): value is TypedParam {
  return typeof value === 'object' && value !== null && '__typed' in value;
}

/** Dinheiro: DECIMAL(10,2), nunca `Float`. */
export function money(value: number): TypedParam {
  return typed(sql.Decimal(10, 2), value);
}

/** Instante em epoch ms → DATETIME2(3) em UTC. */
export function at(epochMs: number): TypedParam {
  return typed(sql.DateTime2(3), new Date(epochMs));
}

export type Params = Record<string, unknown>;

function bind(request: sql.Request, params: Params): sql.Request {
  for (const [name, raw] of Object.entries(params)) {
    // `undefined` faz o driver lançar; `null` é o que o SQL entende por vazio.
    const value = raw === undefined ? null : raw;
    if (isTyped(value)) request.input(name, value.type, value.value);
    else request.input(name, value);
  }
  return request;
}

/**
 * Consulta parametrizada. **Nunca** monte SQL concatenando valor.
 *
 * Todo valor que vem do cliente entra como `@parâmetro`; o driver o envia
 * separado do texto do comando, e o servidor nunca o interpreta como código.
 * É o que fecha a porta de injeção — e não a validação da entrada, que é outra
 * camada, para outro problema.
 */
export async function query<T>(text: string, params: Params = {}): Promise<T[]> {
  const pool = await getPool();
  const result = await bind(pool.request(), params).query<T>(text);
  return result.recordset ?? [];
}

/** A primeira linha, ou `undefined`. */
export async function queryOne<T>(
  text: string,
  params: Params = {},
): Promise<T | undefined> {
  return (await query<T>(text, params))[0];
}

/** Para INSERT/UPDATE/DELETE sem retorno: devolve as linhas afetadas. */
export async function execute(text: string, params: Params = {}): Promise<number> {
  const pool = await getPool();
  const result = await bind(pool.request(), params).query(text);
  return result.rowsAffected.reduce((total, n) => total + n, 0);
}

/* --------------------------------- erros --------------------------------- */

/** 2601/2627: violação de índice único ou de PRIMARY KEY. */
export function isUniqueViolation(error: unknown): boolean {
  const number = (error as { number?: number } | null)?.number;
  return number === 2601 || number === 2627;
}
