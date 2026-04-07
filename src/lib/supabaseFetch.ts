/**
 * Évite les requêtes HTTP qui restent en suspens (spinner connexion infini).
 */
const FETCH_TIMEOUT_MS = 45_000;

export const supabaseFetch: typeof fetch = async (input, init) => {
  if (init?.signal) {
    return fetch(input, init);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};
