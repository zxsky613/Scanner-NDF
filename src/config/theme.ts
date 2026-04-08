/** Marque UI type « soft fintech » (ex. Walletit) — à utiliser pour les couleurs hors Tailwind. */
export const theme = {
  brandPrimary: '#2D5BFF',
  surface: '#F5F6FA',
  /** Cartes / héros principaux */
  cardRadius: 28,
} as const;

/**
 * Padding haut des héros titre (liste / tableau de bord).
 * `safeAreaTop` = `useSafeAreaInsets().top` pour respecter encoche & Dynamic Island.
 */
export function headerPaddingTop(safeAreaTop: number): number {
  return safeAreaTop + 14;
}
