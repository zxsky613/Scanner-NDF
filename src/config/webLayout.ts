import { Platform, ViewStyle } from 'react-native';
import { theme } from './theme';

/** Expo web uniquement : le code mobile ne lit pas ces styles. */
export const IS_WEB = Platform.OS === 'web';

/** Largeur max de la colonne centrée (finance / listes). */
export const WEB_MAX_CONTENT_WIDTH = 1440;

/** Fond plein écran derrière la colonne centrée (évite bandes blanches sur ultra-wide). */
export const webAppShellOuter: ViewStyle = {
  flex: 1,
  width: '100%',
  backgroundColor: theme.surface,
  alignItems: 'center',
};

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
