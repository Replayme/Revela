import { NextResponse } from 'next/server';
import { createPhoto, photographerOfUser } from '@/lib/repository';
import { lerFichaDeFoto } from '@/lib/photo-validation';
import { currentSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/fotos — grava a foto que o navegador já enviou ao bucket.
 *
 * **O arquivo não passa por aqui.** Uma função da Vercel recusa corpo acima de
 * ~4,5 MB, e o acervo aceita 25 MB: o navegador manda direto para o Vercel
 * Blob, autorizado por um token de curta duração que `/api/fotos/upload`
 * emite, e esta rota recebe só o caminho de onde o arquivo ficou. É por isso
 * que ela é barata mesmo com foto grande.
 *
 * A ordem importa: o upload acontece **antes** do registro. Um upload sem
 * registro deixa um arquivo órfão no bucket, que é lixo barato e limpável; a
 * ordem contrária deixaria uma foto no acervo apontando para um arquivo que
 * não existe — e o acervo mostraria um quadro quebrado com preço.
 *
 * `storageKey` vem do cliente, e por isso é conferido: o token de upload é
 * emitido com o prefixo do autor, então um caminho fora dele é sinal de que
 * alguém está tentando registrar como sua a foto de outra pessoa.
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const photographer = await photographerOfUser(session.sub);
  if (!photographer) {
    // Não é autor: publicar não é uma ação que exista para esta conta.
    return NextResponse.json({ error: 'NOT_A_PHOTOGRAPHER' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const { ficha, invalidos } = lerFichaDeFoto(body);

  if (invalidos.length > 0 || !ficha) {
    return NextResponse.json(
      {
        error: 'VALIDATION',
        fields: Object.fromEntries(invalidos.map((campo) => [campo, 'invalid'])),
      },
      { status: 400 },
    );
  }

  // O prefixo é a fronteira entre os autores dentro do bucket. Conferi-lo aqui
  // é o que impede alguém de registrar como sua uma foto que outra pessoa
  // enviou — o id do autor sai da sessão, o caminho vem do cliente.
  const prefixo = `fotos/${photographer.id}/`;
  if (!ficha.storageKey.startsWith(prefixo)) {
    return NextResponse.json(
      { error: 'VALIDATION', fields: { storageKey: 'invalid' } },
      { status: 400 },
    );
  }

  const photo = await createPhoto({ ...ficha, photographerId: photographer.id });

  return NextResponse.json({ photo }, { status: 201 });
}
