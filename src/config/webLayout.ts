import { Platform, ViewStyle } from 'react-native';
import { theme } from './theme';

/**
 * Expo web uniquement : le code mobile ne lit pas ces styles.
 * (Dans le navigateur, `Platform.OS` vaut bien `'web'` — si vous voyez l’UI « mobile »
 * en grand écran, vérifiez d’ouvrir la build **web** : `npx expo start --web` ou l’URL Vercel à jour.)
 */
export const IS_WEB = Platform.OS === 'web';

/**
 * Styles impératifs pour le héros d’écran sur le web : garantissent le padding même si
 * certaines classes Tailwind ne sont pas appliquées par NativeWind sur le web.
 */
export const webHeroCardInlineStyle: ViewStyle = {
  borderRadius: 14,
  paddingVertical: 8,
  paddingHorizontal: 14,
};

export const webHeaderOuterInlineStyle: ViewStyle = {
  paddingBottom: 4,
};

/** Encarts chiffres (nombre de notes, etc.) dans le héros web — plus bas qu’en mobile. */
export const webHeroStatBoxStyle: ViewStyle = {
  paddingVertical: 6,
  paddingHorizontal: 10,
};

/** Largeur max de la colonne centrée (finance / listes). */
export const WEB_MAX_CONTENT_WIDTH = 1440;

/** Fond plein écran derrière la colonne centrée (évite bandes blanches sur ultra-wide). */
export const webAppShellOuter: ViewStyle = {
  flex: 1,
  width: '100%',
  backgroundColor: theme.surface,
  alignItems: 'center',
};

/**
 * Carte « héros » (titres d’onglets) sur web : moins de padding que le mobile (px-6 py-6).
 */
export const WEB_HERO_CARD_CLASS = 'rounded-2xl px-4 py-3';

/** Colonne centrée : largeur max + même fond que le reste de l’app. */
export const webAppShellInner: ViewStyle = {
  flex: 1,
  width: '100%',
  maxWidth: WEB_MAX_CONTENT_WIDTH,
  alignSelf: 'center',
  backgroundColor: theme.surface,
};

/**
 * Barre d’onglets en bas (web) : comme le mobile, avec bordure haute et ombre légère.
 */
export function webBottomTabBarStyle(): ViewStyle {
  return {
    height: 72,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(36, 41, 73, 0.1)',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 -4px 24px rgba(36, 41, 73, 0.07)',
        } as ViewStyle)
      : {}),
  };
}
