/**
 * Évite les requêtes HTTP qui restent en suspens (spinner connexion infini).
 * Les Edge Functions IA (scan ticket) peuvent dépasser 45s → timeout plus long.
 */
const FETCH_TIMEOUT_MS = 45_000;
const FUNCTIONS_TIMEOUT_MS = 120_000;

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export const supabaseFetch: typeof fetch = async (input, init) => {
  if (init?.signal) {
    return fetch(input, init);
  }
  const url = resolveUrl(input);
  const timeoutMs = url.includes('/functions/v1/')
    ? FUNCTIONS_TIMEOUT_MS
    : FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};
