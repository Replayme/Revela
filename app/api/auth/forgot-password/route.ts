import { NextResponse } from 'next/server';
import { checkLimits, clientIp, registerFailure } from '@/lib/rate-limit';
import { createResetToken, findUserByEmail } from '@/lib/mock-db';
import { isValidEmail } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/forgot-password — MOCK.
 *
 * Responde SEMPRE 200, exista a conta ou não. Aqui não há escolha: dizer
 * "e-mail não encontrado" nesta tela entrega uma lista de clientes a qualquer
 * um que peça. O e-mail (ou a ausência dele) é que informa a pessoa.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  // Limite próprio: pedir reset também é um vetor de abuso (spam de e-mail).
  const limits = checkLimits(ip, `reset:${email}`);
  if (limits.blocked) {
    return NextResponse.json(
      { error: limits.reason, retryAfterSeconds: limits.retryAfterSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(limits.retryAfterSeconds) },
      },
    );
  }
  registerFailure(ip, `reset:${email}`);

  await new Promise((resolve) => setTimeout(resolve, 500));

  const user = findUserByEmail(email);
  let devResetUrl: string | undefined;

  if (user && !user.disabled) {
    const token = createResetToken(user.id);
    // Em produção: enfileirar o e-mail com este link e NÃO devolvê-lo na resposta.
    devResetUrl = `/redefinir-senha?token=${token}`;
  }

  return NextResponse.json({
    ok: true,
    // Presente apenas fora de produção, para conseguir testar o fluxo sem e-mail.
    ...(process.env.NODE_ENV !== 'production' && devResetUrl
      ? { devResetUrl }
      : {}),
  });
}
