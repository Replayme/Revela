'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PhotoUploadForm, type PhotoDraft } from './photo-upload-form';
import { IconAlert, IconCheck } from './icons';
import { formatFileSize, formatPrice } from '@/lib/format';
import type { Category } from '@/lib/model';

export function NewPhotoScreen({ categories }: { categories: Category[] }) {
  const [ficha, setFicha] = useState<PhotoDraft | null>(null);

  function receber(draft: PhotoDraft) {
    setFicha(draft);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (ficha) return <FichaPronta ficha={ficha} onNova={() => setFicha(null)} />;

  return (
    <>
      <AvisoDeEntrada />
      <div className="mt-9">
        <PhotoUploadForm
          categories={categories}
          onSubmit={receber}
          submitLabel="Conferir a ficha"
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
        <p className="font-semibold text-paper">Esta tela ainda não publica.</p>
        <p className="mt-1.5">
          Falta o lugar onde o arquivo vai ser guardado — a rota que grava a
          ficha (<code className="font-mono text-paper-400">POST /api/fotos</code>)
          já existe. Até lá o formulário confere tudo — tipo, tamanho, medidas,
          título e preço — e mostra a ficha que seria enviada, mas nada é
          gravado.
        </p>
      </div>
    </div>
  );
}

function FichaPronta({
  ficha,
  onNova,
}: {
  ficha: PhotoDraft;
  onNova: () => void;
}) {
  return (
    <div className="mt-9">

      <div className="flex items-start gap-3 border-l-[3px] border-signal-ok bg-signal-ok/12 px-4 py-3.5">
        <IconCheck width={17} height={17} className="mt-0.5 shrink-0 text-signal-ok" />
        <div className="min-w-0 text-sm leading-relaxed text-paper-300">
          <p className="font-semibold text-paper">
            A ficha está pronta e passou na conferência.
          </p>
          <p className="mt-1.5">
            Ela não foi enviada, porque ainda não há para onde. Nada foi
            gravado.
          </p>
        </div>
      </div>

      <dl className="mt-7 grid gap-px border border-paper/12 bg-paper/12">
        <Linha rotulo="Título" valor={ficha.title} />
        <Linha rotulo="Categoria" valor={ficha.category} />
        <Linha rotulo="Preço" valor={formatPrice(ficha.price)} />
        <Linha
          rotulo="Medidas"
          valor={`${ficha.width}×${ficha.height} · ${
            ficha.orientation === 'horizontal' ? 'horizontal' : 'vertical'
          }`}
          nota="Lidas do arquivo, não digitadas."
        />
        <Linha
          rotulo="Arquivo"
          valor={
            ficha.file
              ? `${ficha.file.name} · ${formatFileSize(ficha.file.size)}`
              : '—'
          }
        />
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={onNova}
          className="bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
        >
          Preencher outra
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

function Linha({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="grid gap-1 bg-prussia-950/50 px-4 py-3.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4 sm:px-5">
      <dt className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase sm:pt-1">
        {rotulo}
      </dt>
      <dd className="min-w-0 break-words text-paper">
        {valor}
        {nota && (
          <span className="mt-0.5 block text-xs text-paper-500">{nota}</span>
        )}
      </dd>
    </div>
  );
}
