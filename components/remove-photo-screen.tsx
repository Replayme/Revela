'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconCheck } from './icons';
import { formatCount, formatPrice } from '@/lib/format';
import type { PhotographerPhoto } from '@/lib/photographer-panel';

/**
 * Tirar uma foto do acervo — despublicar ou remover.
 *
 * **As duas moram na mesma tela de propósito.** Não são dois assuntos: são o
 * mesmo, com pesos diferentes, e o erro que essa tela existe para evitar é
 * remover querendo despublicar. Separá-las em duas telas esconderia justamente
 * a comparação que precisa ser feita — quem chega aqui já decidiu tirar a foto
 * da venda, e o que falta decidir é se isso tem volta.
 *
 * Por isso despublicar vem primeiro e leva o botão cheio: é a escolha certa na
 * dúvida, e desempata a favor do que se desfaz.
 *
 * **A licença já emitida não volta atrás em nenhuma das duas.** É a parte não
 * óbvia, e a que muda o que "remover" quer dizer aqui: remover tira a foto da
 * venda, não das mãos de quem comprou. Um fotógrafo que espera o contrário
 * precisa descobrir isso antes de clicar, não depois.
 *
 * Nada é gravado — falta `PATCH` e `DELETE` por id — e o aviso disso está na
 * entrada, como nas outras telas do painel.
 */
export function RemovePhotoScreen({ photo }: { photo: PhotographerPhoto }) {
  const router = useRouter();
  const [feito, setFeito] = useState<'despublicar' | 'remover' | null>(null);
  const [emCurso, setEmCurso] = useState<'despublicar' | 'remover' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Duas ações, dois verbos HTTP, e é a diferença entre elas que decide qual.
   *
   * Despublicar é uma mudança de estado da ficha: `PATCH` com
   * `status: 'rascunho'`. A foto continua no painel e volta à venda quando o
   * autor quiser.
   *
   * Remover tira do acervo: `DELETE`. Que, no servidor, também não apaga linha
   * nenhuma — grava `removed_at`, porque a licença de quem já comprou é
   * perpétua e o recibo precisa continuar resolvendo. "Não tem volta" é
   * verdade para o autor, e é o que a tela promete; o que não se pode é apagar
   * a venda junto.
   */
  async function executar(acao: 'despublicar' | 'remover') {
    setEmCurso(acao);
    setErro(null);

    try {
      const resposta =
        acao === 'despublicar'
          ? await fetch(`/api/fotos/${photo.id}`, {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ status: 'rascunho' }),
            })
          : await fetch(`/api/fotos/${photo.id}`, { method: 'DELETE' });

      if (!resposta.ok) {
        setErro(
          resposta.status === 404
            ? 'Esta foto não está mais no seu acervo.'
            : 'Não deu para concluir agora. Tente de novo.',
        );
        setEmCurso(null);
        return;
      }

      // O painel é servido pelo servidor: sem o `refresh`, voltar para
      // "minhas fotos" mostraria a foto ainda lá, vinda do cache do roteador.
      router.refresh();
      setFeito(acao);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErro('Não deu para falar com o servidor. Verifique a conexão.');
      setEmCurso(null);
    }
  }

  if (feito) return <Resultado acao={feito} photo={photo} />;

  return (
    <>
      <LicencasSeguem photo={photo} />

      {erro && (
        <p
          role="alert"
          className="mt-6 border-l-[3px] border-signal-error bg-signal-error/12 px-4 py-3 text-sm text-paper-200"
        >
          {erro}
        </p>
      )}

      <div className="mt-10 grid gap-5">
        <Opcao
          titulo="Despublicar"
          resumo="Sai da venda, continua sua."
          consequencias={[
            'A foto sai da busca, do acervo e do seu perfil.',
            'Ninguém consegue comprá-la enquanto estiver assim.',
            'Ela continua no seu painel, e você republica quando quiser.',
          ]}
          rotuloBotao="Despublicar"
          perguntaConfirmacao={`Tirar “${photo.title}” da venda?`}
          tom="normal"
          emCurso={emCurso === 'despublicar'}
          desabilitado={emCurso !== null}
          onConfirmar={() => executar('despublicar')}
        />

        <Opcao
          titulo="Remover"
          resumo="Sai do acervo e do painel. Não tem volta."
          consequencias={[
            'A foto sai da busca, do acervo e do seu perfil.',
            'Sai também do seu painel — e não há como desfazer.',
            'Se você quiser vendê-la de novo, terá de enviar o arquivo outra vez, e ela entra como foto nova.',
          ]}
          rotuloBotao="Remover"
          perguntaConfirmacao={`Remover “${photo.title}” em definitivo?`}
          tom="risco"
          emCurso={emCurso === 'remover'}
          desabilitado={emCurso !== null}
          onConfirmar={() => executar('remover')}
        />
      </div>
    </>
  );
}

/**
 * O que **não** muda — e é o que mais surpreende.
 *
 * Fica acima das duas opções porque vale para as duas, e porque quem lê isso
 * depois de escolher já escolheu com a informação errada.
 */
function LicencasSeguem({ photo }: { photo: PhotographerPhoto }) {
  if (photo.sales === 0) {
    return (
      <p className="mt-7 max-w-[62ch] leading-relaxed text-paper-300">
        Esta foto ainda não foi licenciada por ninguém, então tirá-la do acervo
        não afeta nenhuma compra.
      </p>
    );
  }

  /*
    A oração inteira troca de número, e não pedaços dela costurados por
    concatenação: foi montando "não altera as licença já emitida, que valem"
    dessa segunda maneira que a tela de edição nasceu com a concordância
    quebrada. Duas frases inteiras não têm como discordar entre si.
  */
  const frase =
    photo.sales === 1
      ? `Uma pessoa já licenciou esta foto, por ${formatPrice(photo.revenue)}. Essa licença é perpétua e não se desfaz por aqui: quem comprou continua podendo usar o arquivo, sem prazo, em qualquer meio.`
      : `${formatCount(photo.sales)} pessoas já licenciaram esta foto, somando ${formatPrice(photo.revenue)}. Essas licenças são perpétuas e não se desfazem por aqui: quem comprou continua podendo usar o arquivo, sem prazo, em qualquer meio.`;

  return (
    <div className="mt-7 border border-paper/15 bg-prussia-950/40 px-5 py-4">
      <h2 className="font-mono text-[10px] tracking-[0.24em] text-amber uppercase">
        {photo.sales === 1
          ? 'A licença já emitida continua valendo'
          : 'As licenças já emitidas continuam valendo'}
      </h2>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-paper-300">{frase}</p>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-paper-300">
        Tirar do acervo encerra as vendas <em>novas</em>. Não é um jeito de
        cancelar as antigas.
      </p>
    </div>
  );
}

/**
 * Uma das duas saídas, com o que ela custa listado antes do botão.
 *
 * A confirmação é em dois toques, no lugar do `window.confirm`: o diálogo do
 * navegador não tem onde caber a pergunta com o nome da foto dentro, e é o
 * nome que faz alguém perceber que está na ficha errada.
 */
function Opcao({
  titulo,
  resumo,
  consequencias,
  rotuloBotao,
  perguntaConfirmacao,
  tom,
  emCurso,
  desabilitado,
  onConfirmar,
}: {
  titulo: string;
  resumo: string;
  consequencias: string[];
  rotuloBotao: string;
  perguntaConfirmacao: string;
  tom: 'normal' | 'risco';
  /** Esta ação está em andamento — é a que muda de rótulo. */
  emCurso: boolean;
  /** Alguma ação está em andamento: as duas travam, para não sair as duas. */
  desabilitado: boolean;
  onConfirmar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const confirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirmando) confirmarRef.current?.focus();
  }, [confirmando]);

  const risco = tom === 'risco';

  return (
    <section
      className={`border px-5 py-5 sm:px-6 sm:py-6 ${
        risco ? 'border-signal-error/40' : 'border-paper/15'
      }`}
    >
      <h2 className="font-serif text-xl leading-snug font-medium text-paper">
        {titulo}
      </h2>
      <p className={`mt-1 text-sm ${risco ? 'text-signal-error' : 'text-paper-400'}`}>
        {resumo}
      </p>

      <ul className="mt-4 grid gap-2">
        {consequencias.map((item) => (
          <li
            key={item}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 text-sm leading-relaxed text-paper-300"
          >
            <span aria-hidden className="pt-2 text-paper-500">
              —
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {!confirmando ? (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className={
              risco
                ? 'border border-signal-error px-5 py-3 text-[11px] font-semibold tracking-[0.16em] text-signal-error uppercase transition-colors hover:bg-signal-error hover:text-paper'
                : 'bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light'
            }
          >
            {rotuloBotao}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <p role="alert" className="text-sm text-paper">
              {perguntaConfirmacao}
            </p>
            <button
              ref={confirmarRef}
              type="button"
              onClick={onConfirmar}
              disabled={desabilitado}
              className={
                (risco
                  ? 'bg-signal-error px-5 py-3 text-[11px] font-bold tracking-[0.16em] text-paper uppercase transition-opacity hover:opacity-90'
                  : 'bg-amber px-5 py-3 text-[11px] font-bold tracking-[0.16em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light') +
                ' disabled:cursor-not-allowed disabled:opacity-60'
              }
            >
              {emCurso ? 'Aguarde…' : 'Confirmar'}
            </button>
            <button
              type="button"
              disabled={desabilitado}
              onClick={() => setConfirmando(false)}
              className="text-[11px] font-medium tracking-[0.16em] text-paper-400 uppercase transition-colors hover:text-paper"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** O que teria acontecido — e a lembrança de que não aconteceu. */
function Resultado({
  acao,
  photo,
}: {
  acao: 'despublicar' | 'remover';
  photo: PhotographerPhoto;
}) {
  const despublicar = acao === 'despublicar';

  return (
    <div className="mt-9">
      <div className="flex items-start gap-3 border-l-[3px] border-signal-ok bg-signal-ok/12 px-4 py-3.5">
        <IconCheck width={17} height={17} className="mt-0.5 shrink-0 text-signal-ok" />
        <div className="min-w-0 text-sm leading-relaxed text-paper-300">
          <p className="font-semibold text-paper">
            {despublicar
              ? '“' + photo.title + '” sairia da venda.'
              : '“' + photo.title + '” seria removida em definitivo.'}
          </p>
          <p className="mt-1.5">
            Nada foi gravado: a foto continua no acervo, publicada, como estava
            antes de você abrir esta tela.
          </p>
        </div>
      </div>

      <dl className="mt-7 grid gap-px border border-paper/12 bg-paper/12">
        <Linha
          rotulo="Chamaria"
          valor={
            despublicar
              ? 'PATCH /api/fotos/' + photo.id
              : 'DELETE /api/fotos/' + photo.id
          }
          mono
        />
        <Linha
          rotulo="No acervo"
          valor="Sai da busca, do acervo e do perfil do autor."
        />
        <Linha
          rotulo="No painel"
          valor={
            despublicar
              ? 'Continua na lista, como rascunho, e pode voltar.'
              : 'Sai da lista, sem desfazer.'
          }
        />
        <Linha
          rotulo="Licenças emitidas"
          valor={
            photo.sales === 0
              ? 'Nenhuma — nada a preservar.'
              : `${formatCount(photo.sales)} — seguem valendo, em qualquer um dos dois casos.`
          }
        />
      </dl>

      <div className="mt-8">
        <Link
          href="/dashboard/minhas-fotos"
          className="inline-block bg-amber px-6 py-3.5 text-sm font-bold tracking-[0.14em] text-prussia-950 uppercase transition-[background-color] hover:bg-amber-light"
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
  mono = false,
}: {
  rotulo: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 bg-prussia-950/50 px-4 py-3.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4 sm:px-5">
      <dt className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase sm:pt-1">
        {rotulo}
      </dt>
      <dd
        className={`min-w-0 break-words text-paper ${mono ? 'font-mono text-sm' : ''}`}
      >
        {valor}
      </dd>
    </div>
  );
}
