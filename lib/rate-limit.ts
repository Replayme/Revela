/**
 * Rate limiting em memória — SOMENTE PARA DEMONSTRAÇÃO.
 *
 * Em produção isto vive no Redis/Upstash ou no gateway (Cloudflare, nginx),
 * nunca na memória do processo Node: com mais de uma instância cada uma teria
 * sua própria contagem e o limite deixaria de valer. Ver docs/API.md.
 *
 * Duas camadas, como pedido:
 *  1. Rate limit por (IP + e-mail): 5 tentativas em 15 minutos.
 *  2. Proteção contra força bruta por IP: 15 falhas em 15 minutos → bloqueio de 30 min.
 */

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export const IP_MAX_FAILURES = 15;
export const IP_BLOCK_MS = 30 * 60 * 1000;

interface Bucket {
  failures: number[]; // timestamps
  blockedUntil?: number;
}

const buckets = new Map<string, Bucket>();

function getBucket(key: string): Bucket {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { failures: [] };
    buckets.set(key, bucket);
  }
  return bucket;
}

function prune(bucket: Bucket, windowMs: number, now: number) {
  bucket.failures = bucket.failures.filter((t) => now - t < windowMs);
}

export interface LimitStatus {
  blocked: boolean;
  /** Segundos até poder tentar de novo. */
  retryAfterSeconds: number;
  /** Tentativas restantes na janela atual. */
  attemptsLeft: number;
  reason?: 'RATE_LIMITED' | 'IP_BLOCKED';
}

const ok: LimitStatus = {
  blocked: false,
  retryAfterSeconds: 0,
  attemptsLeft: MAX_ATTEMPTS,
};

/** Consulta o estado antes de verificar a senha. Não conta tentativa. */
export function checkLimits(ip: string, email: string): LimitStatus {
  const now = Date.now();

  const ipBucket = getBucket(`ip:${ip}`);
  if (ipBucket.blockedUntil && ipBucket.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((ipBucket.blockedUntil - now) / 1000),
      attemptsLeft: 0,
      reason: 'IP_BLOCKED',
    };
  }

  const userBucket = getBucket(`user:${ip}:${email.toLowerCase()}`);
  prune(userBucket, WINDOW_MS, now);

  if (userBucket.failures.length >= MAX_ATTEMPTS) {
    const oldest = userBucket.failures[0];
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((oldest + WINDOW_MS - now) / 1000),
      attemptsLeft: 0,
      reason: 'RATE_LIMITED',
    };
  }

  return {
    ...ok,
    attemptsLeft: MAX_ATTEMPTS - userBucket.failures.length,
  };
}

/** Registra uma falha de autenticação e devolve o novo estado. */
export function registerFailure(ip: string, email: string): LimitStatus {
  const now = Date.now();

  const userBucket = getBucket(`user:${ip}:${email.toLowerCase()}`);
  prune(userBucket, WINDOW_MS, now);
  userBucket.failures.push(now);

  const ipBucket = getBucket(`ip:${ip}`);
  prune(ipBucket, WINDOW_MS, now);
  ipBucket.failures.push(now);

  if (ipBucket.failures.length >= IP_MAX_FAILURES) {
    ipBucket.blockedUntil = now + IP_BLOCK_MS;
    ipBucket.failures = [];
  }

  return checkLimits(ip, email);
}

/** Login bem-sucedido zera a contagem daquele par IP+e-mail. */
export function clearFailures(ip: string, email: string) {
  buckets.delete(`user:${ip}:${email.toLowerCase()}`);
}

/** Extrai o IP do cliente respeitando proxies confiáveis. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? '127.0.0.1';
}
