import { NextResponse } from 'next/server';
import { checkLimits, clientIp, registerFailure } from '@/lib/rate-limit';
import { createResetToken, findUserByEmail } from '@/lib/repository';
import { isValidEmail } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const user = await findUserByEmail(email);
  let devResetUrl: string | undefined;

  if (user && !user.disabled) {
    const token = await createResetToken(user.id);

    devResetUrl = `/redefinir-senha?token=${token}`;
  }

  return NextResponse.json({
    ok: true,

    ...(process.env.NODE_ENV !== 'production' && devResetUrl
      ? { devResetUrl }
      : {}),
  });
}
