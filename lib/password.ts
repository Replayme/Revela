import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hash de senha, sozinho num módulo.
 *
 * Estava dentro do `mock-db`, junto com o armazenamento. Só que o algoritmo
 * não é do mock: é a regra do site, e vale igual com o banco em memória ou no
 * SQL Server. Deixá-lo lá obrigaria a implementação nova a importar a antiga
 * — ou, pior, a escrever a sua própria versão do hash e divergir no dia em
 * que uma das duas for corrigida.
 *
 * O formato guardado é `scrypt$<salt hex>$<hash hex>`, com o esquema no
 * começo de propósito: quando a troca por argon2id acontecer, as senhas
 * antigas continuam verificáveis por este ramo enquanto as novas nascem no
 * outro. Sem o prefixo, migrar exigiria fazer todo mundo redefinir a senha.
 *
 * ⚠️ Em produção, prefira argon2id (ou bcrypt cost >= 12) a este scrypt de
 * parâmetros padrão. Ver docs/API.md §6.
 */

/** Formato: `scrypt$<salt hex>$<hash hex>`. Cabe em VARCHAR(255). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Comparação em tempo constante: o tempo de resposta não conta o prefixo certo. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const derived = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
