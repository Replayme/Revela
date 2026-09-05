import 'server-only';
import { issueSignedToken, presignUrl } from '@vercel/blob';

const ENTREGA_VALIDA_POR_MS = 5 * 60 * 1000;
const TEMPO_LIMITE_MS = 8_000;

export function blobConfigurado(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function comTempoLimite<T>(trabalho: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    trabalho,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('tempo limite ao falar com o armazenamento')), ms),
    ),
  ]);
}

export async function assinarEntrega(storageKey: string): Promise<string> {
  const validUntil = Date.now() + ENTREGA_VALIDA_POR_MS;

  return comTempoLimite(
    (async () => {
      const delegacao = await issueSignedToken({
        pathname: storageKey,
        operations: ['get'],
        validUntil,
        abortSignal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      });

      const { presignedUrl } = await presignUrl(delegacao, {
        access: 'private',
        operation: 'get',
        pathname: storageKey,
        validUntil,
      });

      return presignedUrl;
    })(),
    TEMPO_LIMITE_MS,
  );
}
