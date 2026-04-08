export const FISCAL_ALERT_THRESHOLD = 150;
export const STORAGE_BUCKET = 'receipts';

export const AI_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Définir dans `.env` : EXPO_PUBLIC_GROQ_API_KEY=gsk_... (jamais dans le code versionné). */
/** Clé Groq sans espaces / guillemets parasites (copier-coller Windows). */
export const AI_API_KEY = (process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '')
  .trim()
  .replace(/^["']|["']$/g, '');
export const AI_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
