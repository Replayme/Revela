import { LegalLink, LegalPage } from '@/components/legal-page';

export const metadata = {
  title: 'Política de privacidade — Revela',
  description:
    'Quais dados o Revela guarda, por quanto tempo e o que você pode pedir.',
};

const ATUALIZADO_EM = '2026-09-03';

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker={`Privacidade · ${ATUALIZADO_EM}`}
      title="O que guardamos de você"
      intro={
        <p>
          O Revela pede pouco e guarda pouco. Esta página lista exatamente o
          quê, por quê e por quanto tempo — e o que você pode exigir a qualquer
          momento, como manda a LGPD (Lei 13.709/2018).
        </p>
      }
      sections={[
        {
          id: '1',
          title: 'Os dados que o site coleta',
          body: (
            <>
              <p>
                <strong className="font-medium text-paper">Da conta:</strong>{' '}
                nome, e-mail e senha. A senha nunca é guardada como você a
                digitou — só o resultado de um cálculo irreversível sobre ela,
                com um sal diferente por conta.
              </p>
              <p>
                <strong className="font-medium text-paper">Das compras:</strong>{' '}
                qual foto, o preço no dia, a versão da licença aceita e a data.
                É o que sustenta a licença no seu nome.
              </p>
              <p>
                <strong className="font-medium text-paper">
                  De quem publica:
                </strong>{' '}
                as fotos enviadas e os dados necessários ao repasse, quando o
                pagamento entrar no ar.
              </p>
            </>
          ),
        },
        {
          id: '2',
          title: 'Para que servem',
          body: (
            <>
              <p>
                Manter sua conta, emitir e comprovar a licença que você comprou,
                pagar quem vendeu e responder ao seu contato. A base legal é a
                execução do contrato entre nós, e a obrigação legal no caso dos
                registros fiscais.
              </p>
              <p>
                Não vendemos seus dados, não os trocamos com anunciantes e não
                usamos seu e-mail para promoção sem você pedir.
              </p>
            </>
          ),
        },
        {
          id: '3',
          title: 'Cookies',
          body: (
            <p>
              Um só, e apenas depois que você entra: o cookie de sessão que
              mantém o login de pé. Ele não é legível por scripts da página,
              trafega só por conexão segura e expira em 12 horas — ou em 30 dias
              se você marcar &ldquo;continuar conectado&rdquo;. Sair da conta o
              apaga. Não há cookie de rastreamento nem de publicidade.
            </p>
          ),
        },
        {
          id: '4',
          title: 'Com quem compartilhamos',
          body: (
            <>
              <p>
                Hoje, com ninguém além da hospedagem que roda o site. Quando o
                pagamento entrar no ar, o processador de pagamentos vai receber o
                mínimo necessário para cobrar e repassar — e esta página será
                atualizada nominalmente antes disso acontecer.
              </p>
              <p>
                Também entregamos dados quando uma ordem judicial obrigar. Nesse
                caso avisamos você, salvo se a própria ordem proibir.
              </p>
            </>
          ),
        },
        {
          id: '5',
          title: 'Por quanto tempo',
          body: (
            <p>
              Os dados da conta ficam enquanto ela existir. Os registros de
              compra ficam além disso, pelo prazo que a lei fiscal exige, porque
              são a prova da licença que você tem — apagá-los apagaria o seu
              direito de uso.
            </p>
          ),
        },
        {
          id: '6',
          title: 'Seus direitos',
          body: (
            <p>
              Você pode pedir a confirmação de que tratamos seus dados, o acesso
              a eles, a correção do que estiver errado, a portabilidade, a
              exclusão do que não formos obrigados a guardar e a revogação de
              consentimento. Basta escrever para{' '}
              <a
                href="mailto:privacidade@revela.com.br"
                className="font-medium text-paper underline decoration-amber decoration-2 underline-offset-4"
              >
                privacidade@revela.com.br
              </a>
              . Respondemos em até 15 dias.
            </p>
          ),
        },
        {
          id: '7',
          title: 'Como protegemos',
          body: (
            <p>
              Senha guardada só em forma irreversível, comparação feita em tempo
              constante para não vazar pistas, link de recuperação guardado
              também em forma irreversível, de uso único e com validade de 24
              horas. Se um vazamento chegar a acontecer, avisamos você e a ANPD.
            </p>
          ),
        },
        {
          id: '8',
          title: 'Mudanças nesta política',
          body: (
            <p>
              Quando ela mudar, a data no topo muda junto. Mudança que amplie o
              uso dos seus dados é avisada por e-mail antes de valer.
            </p>
          ),
        },
      ]}
      related={
        <>
          <LegalLink href="/termos">Termos de uso</LegalLink>
          <LegalLink href="/licenca">Licença Revela</LegalLink>
        </>
      }
    />
  );
}
