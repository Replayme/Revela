import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { Pool } from 'pg';

function connectionString(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

export function isDatabaseConfigured(): boolean {
  return connectionString() !== undefined;
}

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

function poolPg(): Pool {
  return (globalClient.__revelaPgPool ??= new Pool({
    connectionString: urlObrigatoria(),
    max: 4,
    idleTimeoutMillis: 30_000,

  }).on('error', () => {
    delete globalClient.__revelaPgPool;
  }));
}

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = urlObrigatoria();
  if (ehNeon(url)) return (await clienteNeon().query(text, params)) as T[];
  return (await poolPg().query(text, params)).rows as T[];
}

export async function queryOne<T>(
  text: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  return (await query<T>(text, params))[0];
}
