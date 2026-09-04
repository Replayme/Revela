'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PhotoUploadForm, type PhotoDraft } from './photo-upload-form';
import { IconAlert, IconCheck } from './icons';
import { formatFileSize, formatPrice } from '@/lib/format';
import type { Category } from '@/lib/model';
import type { PhotographerPhoto } from '@/lib/photographer-panel';

/**
 * A tela de editar a ficha de uma foto que já está no acervo.
 *
 * Ela mostra **o que mudaria** antes de salvar, e não a ficha inteira: numa
 * edição o que importa é a diferença. Uma lista com os cinco campos repetidos
 * esconde, no meio dos iguais, o único que foi mexido — e é justamente ele que
 * a pessoa quer conferir.
 *
 * A conferência continua sendo um passo à parte, e não virou "salvar direto",
 * porque a razão dela não era a falta da rota: mudar o preço de uma foto que
 * já vendeu é o tipo de coisa que se quer ver escrita antes de confirmar.
 *
 * **Trocar o arquivo ainda não funciona** — falta o lugar onde guardá-lo. O
 * aviso de entrada diz isso, e o resultado repete no momento em que a troca é
 * detectada, porque é lá que a pessoa descobre que aquele campo não vale.
 */
export function EditPhotoScreen({
  photo,
  categories,
}: {
  photo: PhotographerPhoto;
  categories: Category[];
}) {
  const router = useRouter();
  const [mudancas, setMudancas] = useState<Mudanca[] | null>(null);
  const [rascunho, setRascunho] = useState<PhotoDraft | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function receber(draft: PhotoDraft) {
    setRascunho(draft);
    setMudancas(compararComOriginal(photo, draft));
    setErro(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Manda só o que mudou.
   *
   * O `PATCH` é parcial de propósito (ver `lib/photo-validation.ts`), então
   * enviar a ficha inteira gravaria `updated_at` numa foto em que só o preço
   * mexeu — e, pior, sobrescreveria com o valor antigo um campo que outra aba
   * tivesse acabado de mudar.
   */
  async function salvar() {
    if (!rascunho) return;
    setSalvando(true);
    setErro(null);

    const patch: Record<string, unknown> = {};
    if (rascunho.title !== photo.title) patch.title = rascunho.title;
    if (rascunho.category !== photo.category) patch.category = rascunho.category;
    if (rascunho.price !== photo.price) patch.price = rascunho.price;

    try {
      const resposta = await fetch(`/api/fotos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!resposta.ok) {
        setErro(
          resposta.status === 404
            ? 'Esta foto não está mais no seu acervo.'
            : 'Não deu para salvar agora. Tente de novo.',
        );
        setSalvando(false);
        return;
      }

      // `refresh()` antes de sair: sem ele a lista de minhas fotos viria do
      // cache do roteador e mostraria o título antigo por um instante, que
      // parece exatamente com "não salvou".
      router.refresh();
      router.push('/dashboard/minhas-fotos');
    } catch {
      setErro('Não deu para falar com o servidor. Verifique a conexão.');
      setSalvando(false);
    }
  }

  if (mudancas) {
    return (
      <Resultado
        mudancas={mudancas}
        arquivoTrocado={Boolean(rascunho?.file)}
        salvando={salvando}
        erro={erro}
        onSalvar={salvar}
        onVoltarAoFormulario={() => setMudancas(null)}
      />
    );
  }

  return (
    <>
      <AvisoDeEntrada />
      <div className="mt-9">
        <PhotoUploadForm
          categories={categories}
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
        <p className="font-semibold text-paper">
          Trocar o arquivo ainda não funciona.
        </p>
        <p className="mt-1.5">
          Título, categoria e preço salvam normalmente. Substituir a imagem
          depende do lugar onde os arquivos vão ser guardados, que ainda não
          existe — se você anexar uma foto nova, ela será ignorada.
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

/**
 * O que mudou entre a ficha do acervo e a que saiu do formulário.
 *
 * O arquivo entra na lista só quando é trocado: `file` vem `null` quando a
 * pessoa não mexeu nele, e é por isso que o formulário aceita edição sem
 * exigir um arquivo novo.
 */
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
  arquivoTrocado,
  salvando,
  erro,
  onSalvar,
  onVoltarAoFormulario,
}: {
  mudancas: Mudanca[];
  arquivoTrocado: boolean;
  salvando: boolean;
  erro: string | null;
  onSalvar: () => void;
  onVoltarAoFormulario: () => void;
}) {
  const semMudanca = mudancas.length === 0;
  // Só o arquivo mudou: não há nada que o PATCH possa gravar, e oferecer
  // "Salvar" seria oferecer um botão que não faz nada.
  const nadaASalvar = semMudanca || (arquivoTrocado && mudancas.length === 1);

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
              ? 'Os campos continuam iguais aos que estão no acervo — não há o que salvar.'
              : 'Confira e salve. Nada foi gravado ainda.'}
          </p>
          {arquivoTrocado && (
            <p className="mt-1.5 text-paper-400">
              A troca do arquivo <strong className="text-paper-300">não será
              salva</strong> — falta o lugar onde guardá-lo.
            </p>
          )}
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
                {/*
                  O valor antigo fica riscado e apagado, o novo em cheio. Só a
                  seta não bastaria: quem não distingue as duas colunas de
                  relance lê a mudança ao contrário.
                */}
                <span className="break-words text-paper-500 line-through decoration-paper/40">
                  {mudanca.de}
                </span>
                <span className="break-words text-paper">{mudanca.para}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {erro && (
        <p
          role="alert"
          className="mt-7 border-l-[3px] border-signal-erro bg-signal-erro/12 px-4 py-3 text-sm text-paper-200"
        >
          {erro}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        {!nadaASalvar && (
          <button
            type="button"
            onClick={onSalvar}
            disabled={salvando}
            className="bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : 'Salvar as mudanças'}
          </button>
        )}
        <button
          type="button"
          onClick={onVoltarAoFormulario}
          disabled={salvando}
          className={
            nadaASalvar
              ? 'bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light disabled:opacity-60'
              : 'text-[11px] font-medium tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper disabled:opacity-60'
          }
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
