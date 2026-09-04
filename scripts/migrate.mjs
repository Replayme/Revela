#!/usr/bin/env node
/*
  Aplicador de migrações — `npm run db:migrate`.

  Lê `db/*.sql` em ordem de nome e aplica o que ainda não foi aplicado,
  registrando cada arquivo em `schema_migrations`. Rodar duas vezes não faz
  nada na segunda; é para poder chamar sem pensar.

  Cada arquivo vai numa transação só, com o registro dele junto: ou o arquivo
  inteiro entrou e ficou marcado, ou não entrou nada. No Postgres o DDL é
  transacional, então isto vale também para `CREATE TABLE` — não existe o
  estado "metade das tabelas criadas" que obrigaria a limpar na mão.

  Os arquivos de seed (`*_seed_*.sql`) ficam de fora por padrão — contas de
  demonstração com senha pública não entram em produção por descuido de um
  comando. Passe `--seed` para incluí-los.

    npm run db:migrate           # só o esquema
    npm run db:migrate -- --seed # esquema + contas de demonstração

  Usa o mesmo driver HTTP da aplicação, e por isso precisa mandar um comando
  por vez: o protocolo do Postgres não aceita vários separados por `;` numa
  consulta parametrizada. Daí o `separarComandos` abaixo.
*/

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Carrega .env.local sem depender da versão do Node ter --env-file. */
for (const arquivo of ['.env.local', '.env']) {
  const caminho = join(raiz, arquivo);
  if (!existsSync(caminho)) continue;
  for (const linha of (await readFile(caminho, 'utf8')).split('\n')) {
    const par = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!par) continue;
    process.env[par[1]] ??= par[2].replace(/^["'](.*)["']$/, '$1');
  }
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('Falta DATABASE_URL. Ver docs/BANCO.md e .env.example.');
  process.exit(1);
}

/**
 * Corta um arquivo `.sql` nos `;` que separam comandos de verdade.
 *
 * Um `split(';')` cru quebraria em qualquer ponto e vírgula dentro de texto ou
 * de comentário — e o seed tem hashes com `$` no meio, que é exatamente o
 * caractere do dollar-quoting. Este laço anda pelo arquivo sabendo onde está.
 */
function separarComandos(sql) {
  const comandos = [];
  let atual = '';

  for (let i = 0; i < sql.length; i++) {
    const resto = sql.slice(i);

    if (resto.startsWith('--')) {
      const fim = sql.indexOf('\n', i);
      i = fim === -1 ? sql.length : fim;
      atual += '\n';
      continue;
    }
    if (resto.startsWith('/*')) {
      const fim = sql.indexOf('*/', i + 2);
      i = fim === -1 ? sql.length : fim + 1;
      atual += ' ';
      continue;
    }
    if (sql[i] === "'" || sql[i] === '"') {
      const aspa = sql[i];
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === aspa && sql[j + 1] === aspa) j += 2; // '' escapa a aspa
        else if (sql[j] === aspa) break;
        else j++;
      }
      atual += sql.slice(i, j + 1);
      i = j;
      continue;
    }
    const dollar = resto.match(/^\$[A-Za-z_]*\$/);
    if (dollar) {
      const tag = dollar[0];
      const fim = sql.indexOf(tag, i + tag.length);
      const j = fim === -1 ? sql.length : fim + tag.length - 1;
      atual += sql.slice(i, j + 1);
      i = j;
      continue;
    }
    if (sql[i] === ';') {
      comandos.push(atual);
      atual = '';
      continue;
    }
    atual += sql[i];
  }

  comandos.push(atual);
  return comandos.map((c) => c.trim()).filter(Boolean);
}

const sql = neon(url);

await sql.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    TEXT        PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const aplicadas = new Set(
  (await sql.query('SELECT filename FROM schema_migrations')).map((l) => l.filename),
);

const comSeed = process.argv.includes('--seed');
const arquivos = (await readdir(join(raiz, 'db')))
  .filter((nome) => nome.endsWith('.sql'))
  .filter((nome) => comSeed || !nome.includes('_seed_'))
  .sort();

let aplicou = 0;

for (const nome of arquivos) {
  if (aplicadas.has(nome)) continue;

  const comandos = separarComandos(await readFile(join(raiz, 'db', nome), 'utf8'));

  try {
    await sql.transaction((txn) => [
      ...comandos.map((comando) => txn.query(comando)),
      txn.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [nome]),
    ]);
  } catch (erro) {
    console.error(`✗ ${nome}`);
    console.error(`  ${erro.message}`);
    process.exit(1);
  }

  console.log(`✓ ${nome} (${comandos.length} comando(s))`);
  aplicou += 1;
}

console.log(
  aplicou === 0
    ? 'Nada a aplicar — o banco já está atualizado.'
    : `${aplicou} migração(ões) aplicada(s).`,
);
