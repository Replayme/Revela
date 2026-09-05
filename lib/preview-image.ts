import { PREVIEW_LADO_MAIOR } from './blob-paths';

const QUALIDADE = 0.82;

export interface Preview {
  arquivo: File;
  width: number;
  height: number;
}

function medidasDoPreview(width: number, height: number): [number, number] {
  const maior = Math.max(width, height);
  if (maior <= PREVIEW_LADO_MAIOR) return [width, height];

  const escala = PREVIEW_LADO_MAIOR / maior;
  return [Math.round(width * escala), Math.round(height * escala)];
}

export async function gerarPreview(original: File): Promise<Preview> {
  const bitmap = await createImageBitmap(original);

  try {
    const [width, height] = medidasDoPreview(bitmap.width, bitmap.height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('canvas indisponível');
    contexto.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE);
    });
    if (!blob) throw new Error('não foi possível gerar o preview');

    const nome = original.name.replace(/\.[^.]+$/, '') + '.jpg';
    return {
      arquivo: new File([blob], nome, { type: 'image/jpeg' }),
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
}
