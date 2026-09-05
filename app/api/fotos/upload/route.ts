import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { blobConfigurado } from '@/lib/blob';
import {
  PREFIXO_ORIGINAIS,
  PREFIXO_PREVIEWS,
  PREVIEW_TAMANHO_MAX,
  TAMANHO_MAX,
  TIPOS_ACEITOS,
  TIPOS_DE_PREVIEW,
  dentroDoPrefixo,
} from '@/lib/blob-paths';
import { photographerOfUser } from '@/lib/repository';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const photographer = await photographerOfUser(session.sub);
  if (!photographer) {
    return NextResponse.json({ error: 'NOT_A_PHOTOGRAPHER' }, { status: 403 });
  }

  if (!blobConfigurado()) {
    return NextResponse.json({ error: 'STORAGE_UNAVAILABLE' }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  try {
    const resposta = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (dentroDoPrefixo(pathname, PREFIXO_ORIGINAIS, photographer.id)) {
          return {
            allowedContentTypes: TIPOS_ACEITOS,
            maximumSizeInBytes: TAMANHO_MAX,
            addRandomSuffix: true,
          };
        }

        if (dentroDoPrefixo(pathname, PREFIXO_PREVIEWS, photographer.id)) {
          return {
            allowedContentTypes: TIPOS_DE_PREVIEW,
            maximumSizeInBytes: PREVIEW_TAMANHO_MAX,
            addRandomSuffix: true,
          };
        }

        throw new Error('caminho fora do prefixo do autor');
      },
    });

    return NextResponse.json(resposta);
  } catch {
    return NextResponse.json({ error: 'UPLOAD_REJECTED' }, { status: 400 });
  }
}
