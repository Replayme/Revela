/**
 * i18n mínimo, sem dependências.
 * Para escalar (mais idiomas, plurais, datas), troque por next-intl mantendo
 * as mesmas chaves — a estrutura abaixo já é compatível.
 */

export const LOCALES = ['pt', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt';

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
};

/** Rótulo curto para o seletor no header, onde o espaço é apertado. */
export const LOCALE_SHORT: Record<Locale, string> = {
  pt: 'PT',
  en: 'EN',
};

const pt = {
  'brand.name': 'Revela',
  'brand.tagline': 'Marketplace de fotógrafos',

  'header.search': 'Buscar por foto, fotógrafo ou categoria',
  'header.searchLabel': 'Buscar no acervo',
  'header.searchAction': 'Buscar',
  'header.nav.explore': 'Explorar',
  'header.nav.categories': 'Categorias',
  'header.nav.license': 'A licença',
  'header.nav.sell': 'Vender fotos',
  'header.signin': 'Entrar',
  'header.account': 'Minha conta',
  'header.signup': 'Criar conta',
  'header.language': 'Idioma',

  'aside.eyebrow': 'Cianotipia · acervo aberto',
  'aside.headline': 'Cada foto sua tem um preço. Aqui ele é seu.',
  'aside.body':
    'Publique ensaios, defina a licença e receba direto — sem intermediário decidindo quanto vale o seu trabalho.',
  'aside.stat1': 'licença, para todo uso',
  'aside.stat2': 'sem prazo de validade',
  'aside.stat3': 'de comissão sobre o cachê',

  'login.eyebrow': 'Acesso à conta',
  'login.title': 'Entrar no Revela',
  'login.subtitle':
    'Acesse seu acervo, seus pedidos e seus recebimentos de vendas.',
  'login.email': 'E-mail',
  'login.emailPlaceholder': 'voce@estudio.com',
  'login.password': 'Senha',
  'login.passwordPlaceholder': 'Sua senha',
  'login.showPassword': 'Mostrar senha',
  'login.hidePassword': 'Ocultar senha',
  'login.remember': 'Manter-me conectado',
  'login.rememberHint': 'Não use em computador compartilhado.',
  'login.forgot': 'Esqueceu a senha?',
  'login.submit': 'Entrar',
  'login.submitting': 'Revelando…',
  'login.success': 'Autenticado. Levando você ao painel…',
  'login.wait': 'Aguarde {time}',
  'login.noAccount': 'Ainda não vende no Revela?',
  'login.createAccount': 'Criar conta de fotógrafo',
  'login.secure': 'Conexão cifrada. Nunca guardamos sua senha em texto plano.',
  'login.demoHint':
    'Demonstração: use ana@revela.com / Revela@2026 para entrar.',

  'signup.eyebrow': 'Conta de fotógrafo',
  'signup.title': 'Criar conta no Revela',
  'signup.subtitle':
    'Publique seu acervo, defina a licença de cada foto e receba direto.',
  'signup.name': 'Nome público',
  'signup.namePlaceholder': 'Como você assina suas fotos',
  'signup.nameHint': 'É o nome que aparece no crédito de cada foto.',
  'signup.password': 'Senha',
  'signup.confirm': 'Confirmar senha',
  'signup.terms': 'Li e aceito os {terms} e a {privacy}.',
  'signup.termsLink': 'termos de uso',
  'signup.privacyLink': 'política de privacidade',
  'signup.termsRequired': 'É preciso aceitar os termos para criar a conta.',
  'signup.submit': 'Criar conta de fotógrafo',
  'signup.submitting': 'Criando…',
  'signup.success': 'Conta criada. Levando você ao painel…',
  'signup.pending': 'Confira seu e-mail para concluir o cadastro.',
  'signup.haveAccount': 'Já tem conta no Revela?',
  'signup.signIn': 'Entrar',
  'signup.secure': 'Sua senha é guardada com hash. Nunca em texto plano.',

  'field.optional': 'opcional',
  'field.valid': 'Válido',

  'validation.nameRequired': 'Informe o nome que assina suas fotos.',
  'validation.nameShort': 'O nome precisa ter ao menos 2 caracteres.',
  'validation.nameLong': 'O nome precisa ter no máximo 80 caracteres.',
  'validation.emailRequired': 'Informe seu e-mail.',
  'validation.emailInvalid': 'Formato de e-mail inválido.',
  'validation.emailValid': 'E-mail válido.',
  'validation.passwordRequired': 'Informe sua senha.',
  'validation.passwordShort': 'A senha precisa ter ao menos 6 caracteres.',
  'validation.passwordMismatch': 'As senhas não coincidem.',
  'validation.confirmRequired': 'Confirme a nova senha.',

  'strength.label': 'Força da senha',
  'strength.weak': 'Fraca',
  'strength.medium': 'Média',
  'strength.strong': 'Forte',
  'strength.hint': 'Combine letras, números e símbolos.',

  'error.EMAIL_TAKEN': 'Já existe uma conta com este e-mail.',
  'error.EMAIL_NOT_FOUND': 'E-mail não encontrado.',
  'error.INVALID_PASSWORD': 'Senha incorreta.',
  'error.INVALID_CREDENTIALS': 'E-mail ou senha incorretos.',
  'error.RATE_LIMITED':
    'Muitas tentativas. Tente novamente em {minutes} minuto(s).',
  'error.IP_BLOCKED':
    'Acesso temporariamente bloqueado por segurança. Tente em {minutes} minuto(s).',
  'error.ACCOUNT_DISABLED': 'Esta conta está desativada. Fale com o suporte.',
  'error.TOKEN_INVALID': 'Link inválido. Solicite uma nova redefinição.',
  'error.TOKEN_EXPIRED': 'Este link expirou. Solicite uma nova redefinição.',
  'error.NETWORK': 'Falha de conexão. Verifique sua internet e tente de novo.',
  'error.UNKNOWN': 'Algo deu errado. Tente novamente em instantes.',
  'error.attemptsLeft': 'Tentativas restantes: {count}.',

  'forgot.eyebrow': 'Recuperação',
  'forgot.title': 'Esqueceu a senha?',
  'forgot.subtitle':
    'Informe o e-mail da conta. Enviamos um link de redefinição válido por 24 horas.',
  'forgot.submit': 'Enviar link de redefinição',
  'forgot.submitting': 'Enviando…',
  'forgot.sentTitle': 'Link enviado',
  'forgot.sentBody':
    'Se existir uma conta para {email}, o link de redefinição chega em alguns minutos. Confira também o spam.',
  'forgot.back': 'Voltar ao login',
  'forgot.devLink': 'Link de demonstração (em produção vai por e-mail):',

  'reset.eyebrow': 'Nova senha',
  'reset.title': 'Definir nova senha',
  'reset.subtitle': 'O link expira 24 horas após o pedido.',
  'reset.password': 'Nova senha',
  'reset.confirm': 'Confirmar nova senha',
  'reset.submit': 'Salvar nova senha',
  'reset.submitting': 'Salvando…',
  'reset.doneTitle': 'Senha atualizada',
  'reset.doneBody': 'Você já pode entrar com a nova senha.',
  'reset.goLogin': 'Ir para o login',
  'reset.missingToken': 'Link sem token. Solicite uma nova redefinição.',

  'dashboard.logout': 'Sair',

  'a11y.loading': 'Carregando',
  'a11y.errorIcon': 'Erro',
  'a11y.okIcon': 'Tudo certo',
} as const;

export type MessageKey = keyof typeof pt;

const en: Record<MessageKey, string> = {
  'brand.name': 'Revela',
  'brand.tagline': 'Photographer marketplace',

  'header.search': 'Search photos, photographers or categories',
  'header.searchLabel': 'Search the archive',
  'header.searchAction': 'Search',
  'header.nav.explore': 'Explore',
  'header.nav.categories': 'Categories',
  'header.nav.license': 'The licence',
  'header.nav.sell': 'Sell photos',
  'header.signin': 'Sign in',
  'header.account': 'My account',
  'header.signup': 'Create account',
  'header.language': 'Language',

  'aside.eyebrow': 'Cyanotype · open archive',
  'aside.headline': 'Every photo of yours has a price. Here it is yours.',
  'aside.body':
    'Publish shoots, set the licence and get paid directly — with no middleman deciding what your work is worth.',
  'aside.stat1': 'licence, for every use',
  'aside.stat2': 'no expiry date',
  'aside.stat3': 'commission on the fee',

  'login.eyebrow': 'Account access',
  'login.title': 'Sign in to Revela',
  'login.subtitle': 'Reach your archive, your orders and your payouts.',
  'login.email': 'Email',
  'login.emailPlaceholder': 'you@studio.com',
  'login.password': 'Password',
  'login.passwordPlaceholder': 'Your password',
  'login.showPassword': 'Show password',
  'login.hidePassword': 'Hide password',
  'login.remember': 'Keep me signed in',
  'login.rememberHint': 'Avoid on a shared computer.',
  'login.forgot': 'Forgot your password?',
  'login.submit': 'Sign in',
  'login.submitting': 'Developing…',
  'login.success': 'Authenticated. Taking you to the dashboard…',
  'login.wait': 'Wait {time}',
  'login.noAccount': 'Not selling on Revela yet?',
  'login.createAccount': 'Create a photographer account',
  'login.secure': 'Encrypted connection. We never store your password in plain text.',
  'login.demoHint': 'Demo: use ana@revela.com / Revela@2026 to sign in.',

  'signup.eyebrow': 'Photographer account',
  'signup.title': 'Create your Revela account',
  'signup.subtitle':
    'Publish your archive, set the licence on each photo and get paid directly.',
  'signup.name': 'Public name',
  'signup.namePlaceholder': 'How you sign your photos',
  'signup.nameHint': 'This is the name credited on every photo.',
  'signup.password': 'Password',
  'signup.confirm': 'Confirm password',
  'signup.terms': 'I have read and accept the {terms} and the {privacy}.',
  'signup.termsLink': 'terms of use',
  'signup.privacyLink': 'privacy policy',
  'signup.termsRequired': 'You need to accept the terms to create an account.',
  'signup.submit': 'Create photographer account',
  'signup.submitting': 'Creating…',
  'signup.success': 'Account created. Taking you to the dashboard…',
  'signup.pending': 'Check your email to finish signing up.',
  'signup.haveAccount': 'Already have a Revela account?',
  'signup.signIn': 'Sign in',
  'signup.secure': 'Your password is stored hashed. Never in plain text.',

  'field.optional': 'optional',
  'field.valid': 'Valid',

  'validation.nameRequired': 'Enter the name you sign your photos with.',
  'validation.nameShort': 'The name must be at least 2 characters.',
  'validation.nameLong': 'The name must be at most 80 characters.',
  'validation.emailRequired': 'Enter your email.',
  'validation.emailInvalid': 'Invalid email format.',
  'validation.emailValid': 'Valid email.',
  'validation.passwordRequired': 'Enter your password.',
  'validation.passwordShort': 'Password must be at least 6 characters.',
  'validation.passwordMismatch': 'Passwords do not match.',
  'validation.confirmRequired': 'Confirm the new password.',

  'strength.label': 'Password strength',
  'strength.weak': 'Weak',
  'strength.medium': 'Medium',
  'strength.strong': 'Strong',
  'strength.hint': 'Mix letters, numbers and symbols.',

  'error.EMAIL_TAKEN': 'An account with this email already exists.',
  'error.EMAIL_NOT_FOUND': 'Email not found.',
  'error.INVALID_PASSWORD': 'Incorrect password.',
  'error.INVALID_CREDENTIALS': 'Incorrect email or password.',
  'error.RATE_LIMITED': 'Too many attempts. Try again in {minutes} minute(s).',
  'error.IP_BLOCKED':
    'Access temporarily blocked for security. Try again in {minutes} minute(s).',
  'error.ACCOUNT_DISABLED': 'This account is disabled. Contact support.',
  'error.TOKEN_INVALID': 'Invalid link. Request a new reset.',
  'error.TOKEN_EXPIRED': 'This link has expired. Request a new reset.',
  'error.NETWORK': 'Connection failed. Check your internet and try again.',
  'error.UNKNOWN': 'Something went wrong. Try again shortly.',
  'error.attemptsLeft': 'Attempts left: {count}.',

  'forgot.eyebrow': 'Recovery',
  'forgot.title': 'Forgot your password?',
  'forgot.subtitle':
    'Enter the account email. We send a reset link valid for 24 hours.',
  'forgot.submit': 'Send reset link',
  'forgot.submitting': 'Sending…',
  'forgot.sentTitle': 'Link sent',
  'forgot.sentBody':
    'If an account exists for {email}, the reset link arrives in a few minutes. Check spam too.',
  'forgot.back': 'Back to sign in',
  'forgot.devLink': 'Demo link (sent by email in production):',

  'reset.eyebrow': 'New password',
  'reset.title': 'Set a new password',
  'reset.subtitle': 'The link expires 24 hours after the request.',
  'reset.password': 'New password',
  'reset.confirm': 'Confirm new password',
  'reset.submit': 'Save new password',
  'reset.submitting': 'Saving…',
  'reset.doneTitle': 'Password updated',
  'reset.doneBody': 'You can sign in with the new password now.',
  'reset.goLogin': 'Go to sign in',
  'reset.missingToken': 'Link has no token. Request a new reset.',

  'dashboard.logout': 'Sign out',

  'a11y.loading': 'Loading',
  'a11y.errorIcon': 'Error',
  'a11y.okIcon': 'All good',
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { pt, en };

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const raw = MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
