#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

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
        if (sql[j] === aspa && sql[j + 1] === aspa) j += 2; 
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
