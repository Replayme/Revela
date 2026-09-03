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

/**
 * POST /api/auth/register — implementação MOCK do contrato em docs/API.md.
 *
 * A mesma variável que governa a enumeração no login vale aqui: um cadastro
 * que responde "este e-mail já tem conta" confirma quem tem conta no site
 * tão bem quanto um login que responde "e-mail não encontrado". Fechar um
 * lado e deixar o outro aberto não fecharia nada.
 *
 *  - REVEAL_ACCOUNT_EXISTENCE = true (padrão): 409 EMAIL_TAKEN, com a tela
 *    oferecendo o caminho de entrar ou recuperar a senha.
 *  - false: 202 e a mesma resposta neutra que o e-mail exista ou não, como
 *    já faz o forgot-password. Quem já tem conta recebe um aviso por e-mail
 *    em vez de uma conta nova.
 */
const REVEAL_ACCOUNT_EXISTENCE =
  process.env.REVEAL_ACCOUNT_EXISTENCE !== 'false';

const FAKE_LATENCY_MS = 600; // só para a demo: torna o loading state visível

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

  // O servidor revalida tudo: validação de cliente é UX, não segurança.
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

  // Criar conta escreve no banco e dispara e-mail: precisa do mesmo teto do
  // login, senão vira o endpoint mais barato de abusar do site.
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
      // Resposta idêntica à de sucesso do ponto de vista de quem chama.
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

  // Cadastrar já abre a sessão: obrigar a fazer login logo depois de criar a
  // conta é pedir a mesma senha duas vezes seguidas, sem ganho nenhum.
  response.cookies.set('revela_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAgeSeconds(false),
  });

  return response;
}
