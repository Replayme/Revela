import { formatCount, formatPrice } from '@/lib/format';
import type { PhotographerSummary } from '@/lib/photographer-panel';

/**
 * O resumo do painel de quem vende: fotos no acervo, licenças emitidas e o que
 * elas renderam.
 *
 * **Os três números vêm por prop e nenhum tem valor de exemplo.** Uma conta
 * recém-criada mostra três zeros, e é isso mesmo — foi assim que a home perdeu
 * os "1.940 fotógrafos" e os "910 mil arquivos" que ninguém podia conferir. Um
 * painel que abre com venda fingida é a mesma mentira, só que mais perto de
 * quem tem como perceber.
 *
 * Sem `use client`: são três números e nenhum evento.
 */
export function PhotographerStats({ summary }: { summary: PhotographerSummary }) {
  return (
    <dl className="grid grid-cols-2 gap-px border border-paper/12 bg-paper/12 sm:grid-cols-3">
      <Stat label="No acervo" value={formatCount(summary.published)} />
      <Stat
        label={summary.sales === 1 ? 'Licença emitida' : 'Licenças emitidas'}
        value={formatCount(summary.sales)}
      />
      {/*
        "Em licenças", e não "Recebido": não há cobrança no site — o
        `docs/API.md` §11 registra que o pedido é gravado direto, sem provedor
        de pagamento. O número é verdadeiro (é a soma do que foi pago em cada
        pedido), mas a palavra "recebido" prometia um repasse que não
        aconteceu, e prometer dinheiro é a pior maneira de errar um rótulo.

        Ele ocupa a linha inteira no celular: com duas colunas cairia sozinho
        na última, e "R$ 1.234,50" é o número mais largo dos três.
      */}
      <Stat
        label="Em licenças"
        value={formatPrice(summary.revenue)}
        className="col-span-2 sm:col-span-1"
      />
    </dl>
  );
}

function Stat({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`bg-prussia-950/50 px-4 py-5 sm:px-5 ${className}`}>
      <dt className="font-mono text-[10px] tracking-[0.24em] text-paper-500 uppercase">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums text-paper">
        {value}
      </dd>
    </div>
  );
}
