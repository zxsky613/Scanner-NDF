/** Detect Supabase / GoTrue "email already in use" style errors. */
export function isEmailAlreadyRegisteredError(error: unknown): boolean {
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
  ];
  return patterns.some(p => msg.includes(p));
}
