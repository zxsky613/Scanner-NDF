import { Platform } from 'react-native';

/**
 * Défilement sous la barre d’onglets basse (hauteur alignée sur `mobileTabBarStyle` dans AppNavigator).
 * À ajouter au `paddingBottom` des ScrollView / listes sur téléphone pour éviter le contenu masqué.
 */
export function mobileTabBarScrollPadding(): number {
  if (Platform.OS === 'web') return 0;
  return Platform.OS === 'ios' ? 96 : 84;
}

/** Seuil TTC au-delà duquel l’alerte fiscale s’affiche (aligner avec le trigger Supabase `compute_expense_metadata`). */
export const FISCAL_ALERT_THRESHOLD = 500;
export const STORAGE_BUCKET = 'receipts';

export const AI_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Définir dans `.env` : EXPO_PUBLIC_GROQ_API_KEY=gsk_... (jamais dans le code versionné). */
/** Clé Groq sans espaces / guillemets parasites (copier-coller Windows). */
export const AI_API_KEY = (process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '')
  .trim()
  .replace(/^["']|["']$/g, '');
export const AI_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
