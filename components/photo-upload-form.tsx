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
import { mockCategories } from '@/lib/mock-categories';
import { formatFileSize, formatPrice } from '@/lib/format';

/**
 * O formulário de publicar uma foto.
 *
 * **Ele não fala com o servidor.** Recebe `onSubmit` e devolve o rascunho
 * pronto; quem o monta decide para onde vai. Enquanto `POST /api/fotos` não
 * existir, a tela que usa este componente é que segura a resposta — e o dia em
 * que existir, nada aqui muda.
 *
 * As medidas do arquivo **não são campos**: saem da própria imagem assim que
 * ela é escolhida. Pedir largura e altura a quem envia é pedir que a pessoa
 * repita o que o navegador já sabe, e a metade das fichas do acervo sairia com
 * número errado.
 */

/** O que sai daqui quando o formulário é enviado. */
export interface PhotoDraft {
  title: string;
  category: string;
  /** Em reais. O campo aceita vírgula; isto aqui já é número. */
  price: number;
  /**
   * O arquivo escolhido. `null` só na edição de uma foto que já existe e cujo
   * arquivo não foi trocado.
   */
  file: File | null;
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
}

const TIPOS_ACEITOS = ['image/jpeg', 'image/png'];
const TAMANHO_MAX = 25 * 1024 * 1024;

/**
 * O acervo entrega arquivos de 2000×3000 e cobra por eles. Um JPEG de 800px de
 * lado não dá para imprimir nem para uma capa — e quem descobre isso depois de
 * pagar é o comprador. A barreira fica na entrada.
 */
const LADO_MINIMO = 1600;

/** Preço em texto ("89,90" ou "89.90") → número. `NaN` quando não é preço. */
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
  initial,
  submitLabel = 'Publicar foto',
  onSubmit,
  onCancel,
}: {
  /** Preenche o formulário para edição. Ausente, é uma foto nova. */
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
    initial?.category ?? mockCategories[0]?.name ?? '',
  );
  // `toFixed(2)` e não `String(price)`: 89.9 chegaria ao campo como "89,9",
  // e um campo de dinheiro que abre com um centavo faltando parece defeito de
  // quem salvou, não de quem preencheu.
  const [preco, setPreco] = useState(
    initial?.price != null ? initial.price.toFixed(2).replace('.', ',') : '',
  );
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  /**
   * Antes do primeiro envio o formulário fica calado: apontar "título curto
   * demais" para quem ainda está digitando a primeira letra é ruído. Depois
   * dele, a conferência passa a ser a cada tecla — senão a mensagem de erro
   * fica na tela depois do campo já ter sido corrigido, dizendo o contrário do
   * que se vê.
   */
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const categoriaId = useId();

  /**
   * O `blob:` fica preso na memória do navegador até alguém o soltar — trocar
   * de arquivo cinco vezes deixaria cinco imagens presas.
   *
   * Soltar isso na limpeza de um `useEffect([selecao])` é o que parece certo e
   * não é: com o StrictMode ligado (o padrão do Next em desenvolvimento) o
   * efeito monta, limpa e monta de novo, e a limpeza revoga o endereço da
   * seleção que acabou de entrar. O preview nasce quebrado, e só em
   * desenvolvimento — o pior lugar para um bug se esconder. Então o endereço
   * antigo é revogado no momento em que o novo o substitui, que é quando isso
   * de fato acontece.
   */
  const urlPreview = useRef<string | null>(null);

  useEffect(() => {
    // No desmonte, e só nele. Na primeira montagem ainda não há o que soltar,
    // então a dobra do StrictMode aqui não custa nada.
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

  // Derivado, não guardado: um `useState` de erros teria que ser limpo campo a
  // campo a cada tecla, e é sempre um campo que se esquece.
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
      // A mensagem do erro não vai crua para a tela pelo mesmo motivo do
      // `app/error.tsx`: ela carrega detalhe de implementação.
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
            {mockCategories.map((item) => (
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

/**
 * A área do arquivo: clique ou arrasta.
 *
 * O `<input type="file">` continua sendo o controle de verdade — a área
 * arrastável é um `<label>` em cima dele. Trocar o input por uma `<div>` com
 * `onClick` custaria o foco por teclado e o anúncio do leitor de tela, que é o
 * que este campo tem de graça.
 */
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

/** Largura e altura reais do arquivo, ou `null` se o navegador não o abrir. */
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
