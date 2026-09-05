'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from 'react';
import Image from 'next/image';
import { Alert, SubmitButton, TextField } from './form';
import { IconImage, IconUpload } from './icons';
import type { Category } from '@/lib/model';
import { formatFileSize, formatPrice } from '@/lib/format';

export interface PhotoDraft {
  title: string;
  category: string;

  price: number;

  file: File | null;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
}

const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];
const TAMANHO_MAX = 25 * 1024 * 1024;

const LADO_MINIMO = 1600;

function parsePrice(valor: string): number {
  const limpo = valor.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return NaN;
  return Number(limpo);
}

interface Selecao {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

export function PhotoUploadForm({
  categories,
  initial,
  submitLabel = 'Publicar foto',
  onSubmit,
  onCancel,
}: {

  categories: Category[];

  initial?: Partial<Pick<PhotoDraft, 'title' | 'category' | 'price'>> & {
    thumbnailUrl?: string;
    width?: number;
    height?: number;
  };
  submitLabel?: string;
  onSubmit: (draft: PhotoDraft) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const isEdicao = Boolean(initial);

  const [titulo, setTitulo] = useState(initial?.title ?? '');
  const [categoria, setCategoria] = useState(
    initial?.category ?? categories[0]?.name ?? '',
  );

  const [preco, setPreco] = useState(
    initial?.price != null ? initial.price.toFixed(2).replace('.', ',') : '',
  );
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const [tentouEnviar, setTentouEnviar] = useState(false);

  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const categoriaId = useId();

  const urlPreview = useRef<string | null>(null);

  useEffect(() => {

    return () => {
      if (urlPreview.current) URL.revokeObjectURL(urlPreview.current);
    };
  }, []);

  function trocarSelecao(nova: Selecao | null) {
    if (urlPreview.current) URL.revokeObjectURL(urlPreview.current);
    urlPreview.current = nova?.previewUrl ?? null;
    setSelecao(nova);
  }

  async function escolherArquivo(file: File | undefined) {
    if (!file) return;
    setFalha(null);

    if (!TIPOS_ACEITOS.includes(file.type)) {
      setErroArquivo('O acervo aceita JPEG e PNG.');
      trocarSelecao(null);
      return;
    }
    if (file.size > TAMANHO_MAX) {
      setErroArquivo('O arquivo passa de 25 MB.');
      trocarSelecao(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const medida = await medirImagem(previewUrl);

    if (!medida) {
      URL.revokeObjectURL(previewUrl);
      setErroArquivo('Não foi possível ler esta imagem.');
      trocarSelecao(null);
      return;
    }
    if (Math.max(medida.width, medida.height) < LADO_MINIMO) {
      URL.revokeObjectURL(previewUrl);
      setErroArquivo(
        `A imagem tem ${medida.width}×${medida.height}. O acervo pede pelo menos ${LADO_MINIMO}px no lado maior.`,
      );
      trocarSelecao(null);
      return;
    }

    setErroArquivo(null);
    trocarSelecao({ file, previewUrl, ...medida });
  }

  function validar(): Record<string, string> {
    const encontrados: Record<string, string> = {};

    if (titulo.trim().length < 5) {
      encontrados.titulo = 'O título precisa de pelo menos 5 caracteres.';
    }

    const valor = parsePrice(preco);
    if (Number.isNaN(valor)) {
      encontrados.preco = 'Use um valor como 89,90.';
    } else if (valor <= 0) {
      encontrados.preco = 'O preço precisa ser maior que zero.';
    }

    if (!selecao && !isEdicao) {
      encontrados.arquivo = 'Escolha o arquivo da foto.';
    }

    return encontrados;
  }

  const erros: Record<string, string> = tentouEnviar ? validar() : {};

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setFalha(null);
    setTentouEnviar(true);

    const encontrados = validar();
    if (Object.keys(encontrados).length > 0) {
      if (encontrados.arquivo) inputArquivoRef.current?.focus();
      return;
    }

    const width = selecao?.width ?? initial?.width ?? 0;
    const height = selecao?.height ?? initial?.height ?? 0;

    setEnviando(true);
    try {
      await onSubmit({
        title: titulo.trim(),
        category: categoria,
        price: parsePrice(preco),
        file: selecao?.file ?? null,
        width,
        height,
        orientation: width >= height ? 'horizontal' : 'vertical',
      });
    } catch (erro) {

      console.error('Falha ao salvar a foto:', erro);
      setFalha('Não deu para salvar agora. Tente de novo em instantes.');
    } finally {
      setEnviando(false);
    }
  }

  const precoValido = !Number.isNaN(parsePrice(preco)) && parsePrice(preco) > 0;

  return (
    <form onSubmit={enviar} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-8">
      <div>
        <FileField
          ref={inputArquivoRef}
          selecao={selecao}
          fallbackUrl={initial?.thumbnailUrl}
          error={erroArquivo ?? erros.arquivo ?? null}
          isEdicao={isEdicao}
          onPick={escolherArquivo}
        />
      </div>

      <div className="grid content-start gap-1">
        <TextField
          tone="dark"
          label="Título"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          error={erros.titulo ?? null}
          placeholder="Véu ao vento na Praia da Pipa"
          maxLength={90}
          hint="É por ele que a foto é encontrada na busca. Diga o que está na imagem, não o equipamento."
        />

        <div>
          <label
            htmlFor={categoriaId}
            className="mb-1.5 block text-[11px] font-semibold tracking-[0.16em] text-paper-500 uppercase"
          >
            Categoria
          </label>
          <select
            id={categoriaId}
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className="w-full rounded-none border border-paper/20 bg-prussia-900/70 px-3.5 py-3 text-base text-paper focus:border-amber focus:outline-none"
          >
            {categories.map((item) => (
              <option key={item.slug} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 min-h-[1.15rem] text-xs text-transparent">.</p>
        </div>

        <TextField
          tone="dark"
          label="Preço do arquivo"
          value={preco}
          onChange={(event) => setPreco(event.target.value)}
          error={erros.preco ?? null}
          inputMode="decimal"
          placeholder="89,90"
          hint={
            precoValido
              ? `Sai por ${formatPrice(parsePrice(preco))}, com a licença de uso ilimitado. Sem comissão.`
              : 'O valor que o comprador paga uma vez. A licença é a mesma para toda foto do acervo.'
          }
        />

        {falha && <Alert tone="error">{falha}</Alert>}

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="min-w-[200px] flex-1">
            <SubmitButton loading={enviando} loadingLabel="Enviando…">
              {submitLabel}
            </SubmitButton>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] font-medium tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function FileField({
  ref,
  selecao,
  fallbackUrl,
  error,
  isEdicao,
  onPick,
}: {
  ref: Ref<HTMLInputElement>;
  selecao: Selecao | null;
  fallbackUrl?: string;
  error: string | null;
  isEdicao: boolean;
  onPick: (file: File | undefined) => void;
}) {
  const id = useId();
  const [arrastando, setArrastando] = useState(false);
  const previewUrl = selecao?.previewUrl ?? fallbackUrl;

  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.16em] text-paper-500 uppercase">
        Arquivo
      </span>

      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(event) => {
          event.preventDefault();
          setArrastando(false);
          onPick(event.dataTransfer.files[0]);
        }}
        className={`block cursor-pointer border border-dashed transition-colors focus-within:border-amber ${
          error
            ? 'border-signal-error'
            : arrastando
              ? 'border-amber bg-amber/5'
              : 'border-paper/25 hover:border-paper/45'
        }`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-prussia-950/40">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt=""
              fill
              sizes="340px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <span className="flex h-full flex-col items-center justify-center px-6 text-center">
              <IconUpload width={26} height={26} className="text-paper-500" />
              <span className="mt-3 text-sm text-paper-300">
                Arraste a foto ou clique para escolher
              </span>
              <span className="mt-1.5 font-mono text-[10px] tracking-[0.16em] text-paper-500 uppercase">
                JPEG ou PNG · até 25 MB
              </span>
            </span>
          )}
        </div>

        <input
          ref={ref}
          id={id}
          type="file"
          accept={TIPOS_ACEITOS.join(',')}
          onChange={(event) => onPick(event.target.files?.[0])}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-message`}
          className="sr-only"
        />
      </label>

      <p
        id={`${id}-message`}
        role={error ? 'alert' : undefined}
        className={`mt-1.5 min-h-[1.15rem] text-xs ${
          error ? 'text-signal-error' : 'text-paper-400'
        }`}
      >
        {error ??
          (selecao ? (
            <>
              <IconImage
                width={12}
                height={12}
                className="mr-1.5 inline align-[-1px]"
              />
              {selecao.width}×{selecao.height} · {formatFileSize(selecao.file.size)}
            </>
          ) : isEdicao ? (
            'Deixe como está para manter o arquivo atual.'
          ) : (
            ' '
          ))}
      </p>
    </div>
  );
}

function medirImagem(
  url: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
