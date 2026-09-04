'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PhotoUploadForm, type PhotoDraft } from './photo-upload-form';
import { IconAlert, IconCheck } from './icons';
import { formatFileSize, formatPrice } from '@/lib/format';

/**
 * A tela de enviar foto — o formulário e o que acontece quando ele termina.
 *
 * **O envio ainda não tem para onde ir**, e o aviso disso está *antes* do
 * formulário, não depois. Descobrir que o trabalho não vale no momento de
 * apertar o botão é o que transforma uma limitação conhecida em perda de
 * tempo; dito na entrada, o preenchimento vira o que ele de fato é hoje —
 * um ensaio da ficha, com a conferência toda funcionando.
 *
 * Não há gravação nenhuma aqui, nem em memória: uma foto "publicada" cujo
 * arquivo foi descartado apareceria no acervo com a imagem de outra pessoa, e
 * é exatamente esse tipo de mentira que o resto do site recusa. Quando
 * `POST /api/fotos` existir, o que muda é o corpo de `receber` — o formulário
 * já entrega a ficha pronta.
 */
export function NewPhotoScreen() {
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
        <PhotoUploadForm onSubmit={receber} submitLabel="Conferir a ficha" />
      </div>
    </>
  );
}

/**
 * O aviso vem antes do formulário e diz o que falta em vez de só dizer que
 * falta: quem lê "depende do lugar onde o arquivo vai ser guardado" sabe se
 * isso é coisa de hoje ou de outro mês.
 */
function AvisoDeEntrada() {
  return (
    <div className="mt-8 flex items-start gap-3 border-l-[3px] border-amber bg-amber/8 px-4 py-3.5">
      <IconAlert width={17} height={17} className="mt-0.5 shrink-0 text-amber" />
      <div className="min-w-0 text-sm leading-relaxed text-paper-300">
        <p className="font-semibold text-paper">Esta tela ainda não publica.</p>
        <p className="mt-1.5">
          Falta <code className="font-mono text-paper-400">POST /api/fotos</code>{' '}
          e o lugar onde o arquivo vai ser guardado. Até lá o formulário
          confere tudo — tipo, tamanho, medidas, título e preço — e mostra a
          ficha que seria enviada, mas nada é gravado.
        </p>
      </div>
    </div>
  );
}

/**
 * O que sairia daqui.
 *
 * A ficha é mostrada inteira de propósito: é ela que prova que o formulário
 * apurou certo — sobretudo as medidas e a orientação, que ninguém digitou.
 */
function FichaPronta({
  ficha,
  onNova,
}: {
  ficha: PhotoDraft;
  onNova: () => void;
}) {
  return (
    <div className="mt-9">
      {/*
        Verde de sinal sobre um véu escuro, e não o `Alert` do formulário:
        aquele é um bloco claro, desenhado para o cartão das telas de acesso, e
        aqui seria a única coisa clara de uma página escura — gritaria mais que
        o aviso âmbar da entrada, que é o mais importante dos dois.
      */}
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
