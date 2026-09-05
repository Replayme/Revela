import { NextResponse } from 'next/server';
import {
  checkLimits,
  clearFailures,
  clientIp,
  registerFailure,
} from '@/lib/rate-limit';
import { verifyPassword } from '@/lib/password';
import { findUserByEmail } from '@/lib/repository';
import { issueSessionToken, sessionMaxAgeSeconds } from '@/lib/tokens';
import { isValidEmail, validatePassword } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REVEAL_ACCOUNT_EXISTENCE =
  process.env.REVEAL_ACCOUNT_EXISTENCE !== 'false';

const FAKE_LATENCY_MS = 600;

export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  let body: { email?: unknown; password?: unknown; remember?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const remember = body.remember === true;

  if (!isValidEmail(email) || validatePassword(password)) {
    return NextResponse.json(
      {
        error: 'VALIDATION',
        fields: {
          email: isValidEmail(email) ? null : 'invalid',
          password: validatePassword(password) ? 'invalid' : null,
        },
      },
      { status: 400 },
    );
  }

  const limits = checkLimits(ip, email);
  if (limits.blocked) {
    return NextResponse.json(
      {
        error: limits.reason,
        retryAfterSeconds: limits.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(limits.retryAfterSeconds) },
      },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));

  const user = await findUserByEmail(email);

  if (!user) {
    const after = registerFailure(ip, email);
    return NextResponse.json(
      {
        error: REVEAL_ACCOUNT_EXISTENCE ? 'EMAIL_NOT_FOUND' : 'INVALID_CREDENTIALS',
        attemptsLeft: after.attemptsLeft,
      },
      { status: REVEAL_ACCOUNT_EXISTENCE ? 404 : 401 },
    );
  }

  if (user.disabled) {
    return NextResponse.json({ error: 'ACCOUNT_DISABLED' }, { status: 403 });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    const after = registerFailure(ip, email);
    if (after.blocked) {
      return NextResponse.json(
        { error: after.reason, retryAfterSeconds: after.retryAfterSeconds },
        {
          status: 429,
          headers: { 'Retry-After': String(after.retryAfterSeconds) },
        },
      );
    }
    return NextResponse.json(
      {
        error: REVEAL_ACCOUNT_EXISTENCE ? 'INVALID_PASSWORD' : 'INVALID_CREDENTIALS',
        attemptsLeft: after.attemptsLeft,
      },
      { status: 401 },
    );
  }

  clearFailures(ip, email);

  const token = issueSessionToken(user, remember);
  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    redirectTo: '/dashboard',
  });

  response.cookies.set('revela_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: remember ? sessionMaxAgeSeconds(true) : undefined,
  });

  return response;
}
