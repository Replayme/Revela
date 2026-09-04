#!/usr/bin/env node
/*
  Aplicador de migrações — `npm run db:migrate`.

  Lê `db/*.sql` em ordem de nome e aplica o que ainda não foi aplicado,
  registrando cada arquivo em `dbo.schema_migrations`. Rodar duas vezes não
  faz nada na segunda; é para poder chamar sem pensar.

  Por que um script e não `sqlcmd`: para não depender de ter as ferramentas da
  Microsoft instaladas na máquina de quem entra no projeto. O driver já está
  no `package.json` porque o site usa.

  Os arquivos de seed (`*_seed_*.sql`) ficam de fora por padrão — contas de
  demonstração com senha pública não entram em produção por descuido de um
  comando. Passe `--seed` para incluí-los.

    npm run db:migrate           # só o esquema
    npm run db:migrate -- --seed # esquema + contas de demonstração

  Este script repete a configuração de conexão de `lib/db.ts` porque roda fora
  do Next, sem o resolvedor de TypeScript. São as mesmas variáveis de ambiente;
  ao mexer numa opção que valha para os dois, mexa nos dois lugares.
*/

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Carrega .env.local sem depender da versão do Node ter --env-file. */
for (const arquivo of ['.env.local', '.env']) {
  const caminho = join(raiz, arquivo);
  if (!existsSync(caminho)) continue;
  for (const linha of (await readFile(caminho, 'utf8')).split('\n')) {
    const par = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!par) continue;
    const valor = par[2].replace(/^["'](.*)["']$/, '$1');
    process.env[par[1]] ??= valor;
  }
}

const obrigatorias = [
  'SQLSERVER_HOST',
  'SQLSERVER_DATABASE',
  'SQLSERVER_USER',
  'SQLSERVER_PASSWORD',
];
const faltando = obrigatorias.filter((nome) => !process.env[nome]);
if (faltando.length > 0) {
  console.error(`Faltam variáveis de ambiente: ${faltando.join(', ')}`);
  console.error('Ver docs/BANCO.md e .env.example.');
  process.exit(1);
}

const comSeed = process.argv.includes('--seed');

const pool = await new sql.ConnectionPool({
  server: process.env.SQLSERVER_HOST,
  port: Number(process.env.SQLSERVER_PORT ?? 1433),
  database: process.env.SQLSERVER_DATABASE,
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  pool: { max: 1, min: 0 },
  options: {
    encrypt: process.env.SQLSERVER_ENCRYPT !== 'false',
    trustServerCertificate: process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE === 'true',
    useUTC: true,
    abortTransactionOnError: true,
    // Migração cria índice, o que num banco com dados pode demorar bem mais
    // que uma consulta de tela.
    requestTimeout: 120_000,
  },
}).connect();

await pool.request().query(`
  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'schema_migrations' AND schema_id = SCHEMA_ID('dbo'))
    CREATE TABLE dbo.schema_migrations (
      filename    VARCHAR(200) NOT NULL CONSTRAINT PK_schema_migrations PRIMARY KEY,
      applied_at  DATETIME2(3) NOT NULL CONSTRAINT DF_schema_migrations_applied_at DEFAULT (SYSUTCDATETIME())
    );
`);

const aplicadas = new Set(
  (await pool.request().query('SELECT filename FROM dbo.schema_migrations')).recordset.map(
    (linha) => linha.filename,
  ),
);

const arquivos = (await readdir(join(raiz, 'db')))
  .filter((nome) => nome.endsWith('.sql'))
  .filter((nome) => comSeed || !nome.includes('_seed_'))
  .sort();

let aplicou = 0;

for (const nome of arquivos) {
  if (aplicadas.has(nome)) continue;

  const conteudo = await readFile(join(raiz, 'db', nome), 'utf8');
  // `GO` não é comando de SQL, é separador de lote do sqlcmd. Quem escreve a
  // migração espera poder usá-lo; quem executa precisa cortar por ele.
  const lotes = conteudo
    .split(/^\s*GO\s*$/im)
    .map((lote) => lote.trim())
    .filter(Boolean);

  const transacao = new sql.Transaction(pool);
  await transacao.begin();
  try {
    for (const lote of lotes) await new sql.Request(transacao).query(lote);
    await new sql.Request(transacao)
      .input('filename', nome)
      .query('INSERT INTO dbo.schema_migrations (filename) VALUES (@filename)');
    await transacao.commit();
  } catch (erro) {
    // Sem o rollback, uma migração que falhou no meio deixa metade das tabelas
    // criadas e a próxima execução falha por outro motivo, escondendo este.
    await transacao.rollback().catch(() => {});
    console.error(`✗ ${nome}`);
    console.error(erro.message);
    await pool.close();
    process.exit(1);
  }

  console.log(`✓ ${nome}`);
  aplicou += 1;
}

console.log(aplicou === 0 ? 'Nada a aplicar — o banco já está atualizado.' : `${aplicou} migração(ões) aplicada(s).`);
await pool.close();
