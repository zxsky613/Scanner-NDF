import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';

/** Aligné sur `app.json` → `expo.scheme` (à garder synchronisé si vous changez le schéma). */
const APP_URL_SCHEME = 'dabars';

/** Préfixes uniques pour Mail / Safari → app (confirmation e-mail Supabase). */
function authDeepLinkPrefixes(): string[] {
  const prefixes = [
    Linking.createURL('/'),
    `${APP_URL_SCHEME}://`,
    `${APP_URL_SCHEME}:/`,
    /** Client de développement Expo / certaines installs qui utilisent exp+<slug> */
    `exp+${APP_URL_SCHEME}://`,
  ];

  return [...new Set(prefixes)];
}

/**
 * Préfixes d’URL reconnus pour l’ouverture depuis Mail / Safari (confirmation e-mail Supabase).
 * Sans cela, certains chemins iOS/iPad peuvent ignorer partiellement le deep link alors que l’écouteur JS existe.
 *
 * À faire matcher dans Supabase → Authentication → URL Configuration → Redirect URLs
 * (ex. dabars://** et l’URL exacte de Linking.createURL('login') sur une build release).
 */
export const rootNavigationLinking: LinkingOptions<Record<string, unknown>> = {
  prefixes: authDeepLinkPrefixes(),
};
