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

/**
 * Extraction IA (Gemini 2.5 Flash) via Edge Function Supabase `extract-receipt`.
 * Clé côté serveur uniquement :
 *   npx supabase secrets set GEMINI_API_KEY=... --project-ref tqvxwthzpahwcscpwyrr
 */
export const AI_PROVIDER = 'gemini';
export const AI_MODEL = 'gemini-2.5-flash';
