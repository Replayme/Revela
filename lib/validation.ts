import type { MessageKey } from './i18n';

export const PASSWORD_MIN_LENGTH = 6;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 254 && EMAIL_RE.test(email);
}

export function validateEmail(value: string): MessageKey | null {
  if (!value.trim()) return 'validation.emailRequired';
  if (!isValidEmail(value)) return 'validation.emailInvalid';
  return null;
}

export function validateName(value: string): MessageKey | null {
  const name = value.trim();
  if (!name) return 'validation.nameRequired';
  if (name.length < NAME_MIN_LENGTH) return 'validation.nameShort';
  if (name.length > NAME_MAX_LENGTH) return 'validation.nameLong';
  return null;
}

export function validatePassword(value: string): MessageKey | null {
  if (!value) return 'validation.passwordRequired';
  if (value.length < PASSWORD_MIN_LENGTH) return 'validation.passwordShort';
  return null;
}

export function validateConfirmation(
  password: string,
  confirmation: string,
): MessageKey | null {
  if (!confirmation) return 'validation.confirmRequired';
  if (password !== confirmation) return 'validation.passwordMismatch';
  return null;
}

export type StrengthLevel = 0 | 1 | 2 | 3;

export interface PasswordStrength {
  level: StrengthLevel;
  labelKey: MessageKey;
  hasLetters: boolean;
  hasNumbers: boolean;
  hasSymbols: boolean;
}

export function scorePassword(value: string): PasswordStrength {
  const hasLetters = /[a-zA-ZÀ-ſ]/.test(value);
  const hasNumbers = /\d/.test(value);
  const hasSymbols = /[^a-zA-Z0-9À-ſ]/.test(value);
  const classes = [hasLetters, hasNumbers, hasSymbols].filter(Boolean).length;

  let level: StrengthLevel = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) {
    if (classes >= 3 && value.length >= 10) level = 3;
    else if (classes >= 2 && value.length >= 8) level = 2;
    else level = 1;
  } else if (value.length > 0) {
    level = 1;
  }

  const labelKey: MessageKey =
    level === 3 ? 'strength.strong' : level === 2 ? 'strength.medium' : 'strength.weak';

  return { level, labelKey, hasLetters, hasNumbers, hasSymbols };
}
