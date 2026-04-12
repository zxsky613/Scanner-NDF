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

/** Largeur max utile pour zones de contenu dense (tableaux, listes) — optionnel par écran. */
export const WEB_MAX_CONTENT_WIDTH = 1440;

/** Maquette web : barre latérale + zone centrale dans une coque max ~1440px. */
export const WEB_DESKTOP_MAX_WIDTH = 1440;

/** Sidebar (tabs gauche) — alignée sur la maquette « dashboard ». */
export const WEB_SIDEBAR_WIDTH = 260;

/** Panneau droit « analyse du document » (nouvelle note, web). */
export const WEB_RIGHT_PANEL_W = 380;

/** Marges horizontales pages principales (web). */
export const WEB_PAGE_GUTTER_CLASS = 'px-10';

/** Marges cartes / listes alignées sur le gutter (web). */
export const WEB_CARD_GUTTER_CLASS = 'mx-10';

/** Fond plein écran : le dégradé `body` (global.css) reste visible si transparent. */
export const webAppShellOuter: ViewStyle = {
  flex: 1,
  width: '100%',
  backgroundColor: 'transparent',
};

/** Contenu applicatif : coque centrée type maquette (sidebar + scène). */
export const webAppShellInner: ViewStyle = {
  flex: 1,
  width: '100%',
  maxWidth: WEB_DESKTOP_MAX_WIDTH,
  alignSelf: 'center',
  backgroundColor: 'transparent',
};

/**
 * Carte « héros » (titres d’onglets) sur web : moins de padding que le mobile (px-6 py-6).
 */
export const WEB_HERO_CARD_CLASS = 'rounded-2xl px-4 py-3';

/**
 * Menu latéral gauche (web) : `tabBarPosition: 'left'` + variante `material`.
 */
export function webLeftTabBarStyle(): ViewStyle {
  return {
    width: WEB_SIDEBAR_WIDTH,
    minWidth: WEB_SIDEBAR_WIDTH,
    maxWidth: WEB_SIDEBAR_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    /** Laisse voir `tabBarBackground` (fond menu). */
    backgroundColor: 'transparent',
    borderRightWidth: 1,
    borderRightColor: 'rgba(36, 41, 73, 0.1)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '4px 0 24px rgba(36, 41, 73, 0.07)',
        } as ViewStyle)
      : {}),
  };
}
