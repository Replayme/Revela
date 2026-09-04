'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhotoUploadForm, type PhotoDraft } from './photo-upload-form';
import { IconAlert, IconCheck } from './icons';
import { formatFileSize, formatPrice } from '@/lib/format';
import type { PhotographerPhoto } from '@/lib/photographer-panel';

export function EditPhotoScreen({ photo }: { photo: PhotographerPhoto }) {
  const router = useRouter();
  const [mudancas, setMudancas] = useState<Mudanca[] | null>(null);

  function receber(draft: PhotoDraft) {
    setMudancas(compararComOriginal(photo, draft));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (mudancas) {
    return (
      <Resultado
        mudancas={mudancas}
        onVoltarAoFormulario={() => setMudancas(null)}
      />
    );
  }

  return (
    <>
      <AvisoDeEntrada />
      <div className="mt-9">
        <PhotoUploadForm
          initial={{
            title: photo.title,
            category: photo.category,
            price: photo.price,
            thumbnailUrl: photo.thumbnailUrl,
            width: photo.width,
            height: photo.height,
          }}
          submitLabel="Conferir as mudanças"
          onSubmit={receber}
          onCancel={() => router.push('/dashboard/minhas-fotos')}
        />
      </div>
    </>
  );
}

function AvisoDeEntrada() {
  return (
    <div className="mt-8 flex items-start gap-3 border-l-[3px] border-amber bg-amber/8 px-4 py-3.5">
      <IconAlert width={17} height={17} className="mt-0.5 shrink-0 text-amber" />
      <div className="min-w-0 text-sm leading-relaxed text-paper-300">
        <p className="font-semibold text-paper">Esta tela ainda não salva.</p>
        <p className="mt-1.5">
          Falta{' '}
          <code className="font-mono text-paper-400">PATCH /api/fotos/{'{id}'}</code>.
          Até lá o formulário confere as mudanças e mostra o que seria gravado —
          a foto no acervo continua como está.
        </p>
      </div>
    </div>
  );
}

interface Mudanca {
  campo: string;
  de: string;
  para: string;
}

function compararComOriginal(
  photo: PhotographerPhoto,
  draft: PhotoDraft,
): Mudanca[] {
  const mudancas: Mudanca[] = [];

  if (draft.title !== photo.title) {
    mudancas.push({ campo: 'Título', de: photo.title, para: draft.title });
  }
  if (draft.category !== photo.category) {
    mudancas.push({ campo: 'Categoria', de: photo.category, para: draft.category });
  }
  if (draft.price !== photo.price) {
    mudancas.push({
      campo: 'Preço',
      de: formatPrice(photo.price),
      para: formatPrice(draft.price),
    });
  }
  if (draft.file) {
    mudancas.push({
      campo: 'Arquivo',
      de: `${photo.width}×${photo.height}`,
      para: `${draft.file.name} · ${formatFileSize(draft.file.size)} · ${draft.width}×${draft.height}`,
    });
  }

  return mudancas;
}

function Resultado({
  mudancas,
  onVoltarAoFormulario,
}: {
  mudancas: Mudanca[];
  onVoltarAoFormulario: () => void;
}) {
  const semMudanca = mudancas.length === 0;

  return (
    <div className="mt-9">
      <div
        className={`flex items-start gap-3 border-l-[3px] px-4 py-3.5 ${
          semMudanca
            ? 'border-paper/30 bg-paper/8'
            : 'border-signal-ok bg-signal-ok/12'
        }`}
      >
        {semMudanca ? (
          <IconAlert width={17} height={17} className="mt-0.5 shrink-0 text-paper-400" />
        ) : (
          <IconCheck width={17} height={17} className="mt-0.5 shrink-0 text-signal-ok" />
        )}
        <div className="min-w-0 text-sm leading-relaxed text-paper-300">
          <p className="font-semibold text-paper">
            {semMudanca
              ? 'Nada mudou na ficha.'
              : mudancas.length === 1
                ? 'Um campo mudaria.'
                : `${mudancas.length} campos mudariam.`}
          </p>
          <p className="mt-1.5">
            {semMudanca
              ? 'Os campos continuam iguais aos que estão no acervo — não haveria o que salvar.'
              : 'Nada foi gravado: a foto no acervo continua como está.'}
          </p>
        </div>
      </div>

      {!semMudanca && (
        <dl className="mt-7 grid gap-px border border-paper/12 bg-paper/12">
          {mudancas.map((mudanca) => (
            <div
              key={mudanca.campo}
              className="grid gap-2 bg-prussia-950/50 px-4 py-3.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4 sm:px-5"
            >
              <dt className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase sm:pt-1">
                {mudanca.campo}
              </dt>
              <dd className="grid min-w-0 gap-1">
                <span className="break-words text-paper-500 line-through decoration-paper/40">
                  {mudanca.de}
                </span>
                <span className="break-words text-paper">{mudanca.para}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={onVoltarAoFormulario}
          className="bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
        >
          Voltar ao formulário
        </button>
        <Link
          href="/dashboard/minhas-fotos"
          className="text-[11px] font-medium tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper"
        >
          Voltar para minhas fotos
        </Link>
      </div>
    </div>
  );
}
