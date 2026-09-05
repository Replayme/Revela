'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { PhotoUploadForm, type PhotoDraft } from './photo-upload-form';
import { IconAlert, IconCheck } from './icons';
import { formatFileSize, formatPrice } from '@/lib/format';
import { caminhoDoOriginal, caminhoDoPreview } from '@/lib/blob-paths';
import { gerarPreview } from '@/lib/preview-image';
import type { Category } from '@/lib/model';

type Etapa = 'preview' | 'original' | 'ficha';

const ROTULO_DA_ETAPA: Record<Etapa, string> = {
  preview: 'Preparando a prévia…',
  original: 'Enviando o arquivo…',
  ficha: 'Publicando…',
};

export function NewPhotoScreen({
  categories,
  photographerId,
}: {
  categories: Category[];
  photographerId: string;
}) {
  const router = useRouter();
  const [ficha, setFicha] = useState<PhotoDraft | null>(null);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function receber(draft: PhotoDraft) {
    setFicha(draft);
    setErro(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function publicar() {
    if (!ficha?.file) return;
    const arquivo = ficha.file;
    setErro(null);

    try {
      setEtapa('preview');
      const preview = await gerarPreview(arquivo);

      const enviadoPreview = await upload(
        caminhoDoPreview(photographerId, preview.arquivo.name),
        preview.arquivo,
        {
          access: 'public',
          handleUploadUrl: '/api/fotos/upload',
          contentType: preview.arquivo.type,
        },
      );

      setEtapa('original');
      const enviadoOriginal = await upload(
        caminhoDoOriginal(photographerId, arquivo.name),
        arquivo,
        {
          access: 'private',
          handleUploadUrl: '/api/fotos/upload',
          contentType: arquivo.type,
          multipart: arquivo.size > 20 * 1024 * 1024,
        },
      );

      setEtapa('ficha');
      const resposta = await fetch('/api/fotos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: ficha.title,
          category: ficha.category,
          price: ficha.price,
          width: ficha.width,
          height: ficha.height,
          thumbnailUrl: enviadoPreview.url,
          fullUrl: enviadoOriginal.url,
          storageKey: enviadoOriginal.pathname,
        }),
      });

      if (!resposta.ok) {
        setErro(
          resposta.status === 403
            ? 'Esta conta não é de fotógrafo.'
            : 'O arquivo subiu, mas a ficha não foi gravada. Tente publicar de novo.',
        );
        setEtapa(null);
        return;
      }

      router.refresh();
      router.push('/dashboard/minhas-fotos');
    } catch {
      setErro('Não deu para concluir o envio. Verifique a conexão e tente de novo.');
      setEtapa(null);
    }
  }

  if (ficha) {
    return (
      <FichaPronta
        ficha={ficha}
        etapa={etapa}
        erro={erro}
        onPublicar={publicar}
        onNova={() => {
          setFicha(null);
          setErro(null);
        }}
      />
    );
  }

  return (
    <div className="mt-9">
      <PhotoUploadForm
        categories={categories}
        onSubmit={receber}
        submitLabel="Conferir a ficha"
      />
    </div>
  );
}

function FichaPronta({
  ficha,
  etapa,
  erro,
  onPublicar,
  onNova,
}: {
  ficha: PhotoDraft;
  etapa: Etapa | null;
  erro: string | null;
  onPublicar: () => void;
  onNova: () => void;
}) {
  const enviando = etapa !== null;

  return (
    <div className="mt-9">
      <div className="flex items-start gap-3 border-l-[3px] border-signal-ok bg-signal-ok/12 px-4 py-3.5">
        <IconCheck width={17} height={17} className="mt-0.5 shrink-0 text-signal-ok" />
        <div className="min-w-0 text-sm leading-relaxed text-paper-300">
          <p className="font-semibold text-paper">
            A ficha está pronta e passou na conferência.
          </p>
          <p className="mt-1.5">
            Confira antes de publicar. Nada foi gravado ainda.
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

      {erro && (
        <div
          role="alert"
          className="mt-7 flex items-start gap-3 border-l-[3px] border-signal-error bg-signal-error/12 px-4 py-3.5"
        >
          <IconAlert width={17} height={17} className="mt-0.5 shrink-0 text-signal-error" />
          <p className="min-w-0 text-sm leading-relaxed text-paper-200">{erro}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={onPublicar}
          disabled={enviando}
          className="bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          {etapa ? ROTULO_DA_ETAPA[etapa] : 'Publicar foto'}
        </button>
        <button
          type="button"
          onClick={onNova}
          disabled={enviando}
          className="text-[11px] font-medium tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper disabled:opacity-60"
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
