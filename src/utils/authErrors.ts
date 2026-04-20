/** Detect Supabase / GoTrue "email already in use" style errors. */
export function isEmailAlreadyRegisteredError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code ?? '');
    if (code === 'user_already_exists' || code === 'identity_already_exists') {
      return true;
    }
  }

  const msg =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message.toLowerCase()
      : '';

  if (!msg) return false;

  const patterns = [
    'already registered',
    'already exists',
    'user already',
    'email address is already',
    'email already',
    'duplicate key',
    'unique violation',
    'database error saving new user',
  ];
  return patterns.some(p => msg.includes(p));
}

/**
 * Supabase peut renvoyer un « faux » user (anti-énumération) quand l’e-mail existe déjà
 * et que la confirmation e-mail / téléphone est activée côté projet.
 */
export function isSignUpObfuscatedDuplicateUser(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false;
  const u = user as { identities?: unknown; email?: unknown };
  const identities = u.identities;
  if (!Array.isArray(identities) || identities.length !== 0) return false;
  const mail = typeof u.email === 'string' ? u.email.trim() : '';
  return mail.length > 0;
}
