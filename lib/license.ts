export interface License {
  id: string;
  version: string;
  name: string;
  updatedAt: string;
  summary: string;
  permissions: string[];
  restrictions: string[];
}

export const UNIVERSAL_LICENSE: License = {
  id: 'revela-universal',
  version: '1.0',
  name: 'Licença Revela',
  updatedAt: '2026-09-03',
  summary:
    'Uso ilimitado, para sempre, em qualquer meio — pessoal, comercial ou editorial.',
  permissions: [
    'Usar em qualquer meio: impresso, digital, vídeo, produto físico, fachada, embalagem.',
    'Usar com fim comercial, editorial ou pessoal, sem distinção de preço entre eles.',
    'Publicar em qualquer país, sem prazo de validade e sem limite de tiragem ou de visualizações.',
    'Recortar, tratar, montar e combinar a foto com outros elementos.',
    'Repassar o arquivo para quem trabalha no seu material — agência, gráfica, editora — para usar em seu nome.',
    'Creditar o autor é bem-vindo, mas não é obrigatório.',
  ],
  restrictions: [
    'Revender ou redistribuir o arquivo como foto avulsa, em banco de imagens ou pacote.',
    'Registrar a foto, sozinha, como marca ou logotipo.',
    'Declarar-se autor da foto.',
    'Usar em conteúdo que ofenda, difame ou exponha quem aparece na imagem.',
    'Treinar modelos de inteligência artificial com o arquivo.',
  ],
};

export function licenseLabel(license: License = UNIVERSAL_LICENSE): string {
  return `${license.name} v${license.version}`;
}

const VERSIONS: Record<string, License> = {
  [UNIVERSAL_LICENSE.version]: UNIVERSAL_LICENSE,
};

export function licenseByVersion(version: string): License | undefined {
  return VERSIONS[version];
}
