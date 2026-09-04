import { NextResponse } from 'next/server';
import { consumeResetToken, updatePassword } from '@/lib/repository';
import { validatePassword } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/reset-password — MOCK. Token de uso único, validade de 24h. */
export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown; confirmation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmation =
    typeof body.confirmation === 'string' ? body.confirmation : '';

  if (!token) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 400 });
  }
  if (validatePassword(password) || password !== confirmation) {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  const check = await consumeResetToken(token);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  await updatePassword(check.userId, password);

  // Em produção: invalidar todas as sessões ativas do usuário aqui e avisar
  // por e-mail que a senha mudou.
  return NextResponse.json({ ok: true });
}
