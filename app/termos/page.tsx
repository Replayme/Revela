import { LegalLink, LegalPage } from '@/components/legal-page';
import { UNIVERSAL_LICENSE } from '@/lib/license';

export const metadata = {
  title: 'Termos de uso',
  description:
    'As regras da conta, da compra e da publicação de fotos no Revela.',
};

const ATUALIZADO_EM = '2026-09-03';

export default function TermsPage() {
  return (
    <LegalPage
      kicker={`Termos de uso · ${ATUALIZADO_EM}`}
      title="As regras da casa"
      intro={
        <p>
          O Revela liga quem fotografa a quem precisa de fotografia brasileira.
          Estes termos dizem o que cada lado assume ao usar o site — em
          português comum, porque ninguém deveria precisar de tradutor para
          entender o que aceitou.
        </p>
      }
      sections={[
        {
          id: '1',
          title: 'Quem é quem',
          body: (
            <>
              <p>
                O Revela é o intermediário: hospeda o acervo, cuida da vitrine e
                emite a licença. Quem fotografou continua sendo o autor da foto
                e o dono dos direitos sobre ela — publicar no Revela não
                transfere a autoria para nós.
              </p>
              <p>
                Quem compra recebe a licença descrita em{' '}
                <LegalLink href="/licenca">{UNIVERSAL_LICENSE.name}</LegalLink>,
                e nada além dela.
              </p>
            </>
          ),
        },
        {
          id: '2',
          title: 'A conta',
          body: (
            <>
              <p>
                Comprar exige conta, porque a licença é emitida em nome de
                alguém: sem conta não há a quem emitir. Navegar e pesquisar o
                acervo não exige nada.
              </p>
              <p>
                Os dados do cadastro precisam ser verdadeiros, e a senha é de
                responsabilidade de quem a escolheu. Se você suspeitar que
                alguém entrou na sua conta, troque a senha e fale com a gente.
              </p>
            </>
          ),
        },
        {
          id: '3',
          title: 'O que a compra dá',
          body: (
            <>
              <p>
                Uma licença só, igual para todo mundo, sem faixa pessoal,
                comercial ou editorial. O texto completo está na página da{' '}
                <LegalLink href="/licenca">licença</LegalLink>.
              </p>
              <p>
                Cada pedido guarda a versão da licença aceita no dia. Se o texto
                mudar, a versão sobe e quem comprou antes segue com a licença
                que aceitou — a nova não vale retroativamente, nem a favor nem
                contra.
              </p>
            </>
          ),
        },
        {
          id: '4',
          title: 'O que quem publica garante',
          body: (
            <>
              <p>
                Ao publicar uma foto, o fotógrafo afirma que a fez, que tem os
                direitos sobre ela e que conseguiu as autorizações necessárias —
                de pessoas identificáveis, de obras de terceiros e de locais que
                exijam permissão.
              </p>
              <p>
                Foto publicada sem esses direitos sai do acervo assim que o
                problema for confirmado, e quem publicou responde pelo que
                causou a quem já tinha licenciado.
              </p>
            </>
          ),
        },
        {
          id: '5',
          title: 'Preço, pagamento e repasse',
          body: (
            <>
              <p>
                O preço de cada foto é definido por quem a publicou. O Revela
                cobra uma taxa sobre a venda, informada antes da publicação, e
                repassa o restante ao fotógrafo.
              </p>
              <p>
                Enquanto o site estiver em demonstração, não há cobrança: o
                pedido registra o preço e a versão da licença, mas nenhum
                pagamento é processado e nenhum repasse é feito. Esta seção passa
                a valer quando o meio de pagamento entrar no ar.
              </p>
            </>
          ),
        },
        {
          id: '6',
          title: 'Quando uma foto sai do acervo',
          body: (
            <p>
              O fotógrafo pode tirar uma foto de venda quando quiser, e nós
              podemos retirá-la em caso de denúncia com fundamento. Nos dois
              casos, as licenças já emitidas continuam valendo: quem comprou não
              perde o uso do que licenciou.
            </p>
          ),
        },
        {
          id: '7',
          title: 'Suspensão de contas',
          body: (
            <p>
              Podemos suspender uma conta que publique material sem direitos,
              revenda arquivos do acervo, tente burlar o pagamento ou ataque o
              funcionamento do site. Sempre que for possível, avisamos antes e
              explicamos o motivo.
            </p>
          ),
        },
        {
          id: '8',
          title: 'Mudanças nestes termos',
          body: (
            <p>
              Estes termos podem mudar. Quando a mudança afetar direitos de quem
              já usa o site, avisamos por e-mail com antecedência. Continuar
              usando o Revela depois do aviso significa aceitar a versão nova.
            </p>
          ),
        },
        {
          id: '9',
          title: 'Lei e foro',
          body: (
            <p>
              Vale a lei brasileira, incluindo o Código de Defesa do Consumidor
              quando ele se aplicar. Discussões que não se resolverem no
              atendimento vão para o foro do domicílio do consumidor.
            </p>
          ),
        },
      ]}
      related={
        <>
          <LegalLink href="/licenca">Licença Revela</LegalLink>
          <LegalLink href="/privacidade">Política de privacidade</LegalLink>
        </>
      }
    />
  );
}
