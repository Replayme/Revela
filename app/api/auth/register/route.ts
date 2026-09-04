import { NextResponse } from 'next/server';
import { checkLimits, clientIp, registerFailure } from '@/lib/rate-limit';
import {
  createUser,
  issueSessionToken,
  sessionMaxAgeSeconds,
} from '@/lib/mock-db';
import {
  isValidEmail,
  validateConfirmation,
  validateName,
  validatePassword,
} from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REVEAL_ACCOUNT_EXISTENCE =
  process.env.REVEAL_ACCOUNT_EXISTENCE !== 'false';

const FAKE_LATENCY_MS = 600;

export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  let body: {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    passwordConfirmation?: unknown;
    acceptedTerms?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmation =
    typeof body.passwordConfirmation === 'string'
      ? body.passwordConfirmation
      : '';
  const acceptedTerms = body.acceptedTerms === true;

  const fields = {
    name: validateName(name) ? 'invalid' : null,
    email: isValidEmail(email) ? null : 'invalid',
    password: validatePassword(password) ? 'invalid' : null,
    passwordConfirmation: validateConfirmation(password, confirmation)
      ? 'invalid'
      : null,
    acceptedTerms: acceptedTerms ? null : 'invalid',
  };

  if (Object.values(fields).some(Boolean)) {
    return NextResponse.json({ error: 'VALIDATION', fields }, { status: 400 });
  }

  const limits = checkLimits(ip, email);
  if (limits.blocked) {
    return NextResponse.json(
      { error: limits.reason, retryAfterSeconds: limits.retryAfterSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(limits.retryAfterSeconds) },
      },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));

  const created = createUser({ name, email, password });

  if (!created.ok) {
    if (!REVEAL_ACCOUNT_EXISTENCE) {
      return NextResponse.json({ pending: true }, { status: 202 });
    }
    registerFailure(ip, email);
    return NextResponse.json({ error: 'EMAIL_TAKEN' }, { status: 409 });
  }

  const user = created.user;
  const token = issueSessionToken(user, false);

  const response = NextResponse.json(
    {
      user: { id: user.id, name: user.name, email: user.email },
      redirectTo: '/dashboard',
    },
    { status: 201 },
  );

  response.cookies.set('revela_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAgeSeconds(false),
  });

  return response;
}
