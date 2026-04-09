/** Palette marque : bleu ardoise + marine — cohérent avec Tailwind `primary` / `ink`. */
export const theme = {
  brandPrimary: '#609FB5',
  /** Texte fort, icônes tab, titres type « encre » */
  brandInk: '#242949',
  /** Onglets / libellés secondaires (lisible sur fond clair) */
  inkMuted: '#8692b0',
  surface: '#F2F6F8',
  /** Cartes / héros principaux */
  cardRadius: 28,
  /**
   * Encart titre (onglets + en-têtes stack) : fond lavé + bord marine douce
   * pour se détacher du blanc sans alourdir.
   */
  heroHeaderBg: '#E8ECF6',
  heroHeaderBorder: 'rgba(36, 41, 73, 0.26)',
} as const;

/** Ombre commune des cartes « titre » (léger relief ink). */
export const heroHeaderShadow = {
  shadowColor: '#242949',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 18,
  elevation: 5,
} as const;

/**
 * Padding haut des héros titre (liste / tableau de bord).
 * `safeAreaTop` = `useSafeAreaInsets().top` pour respecter encoche & Dynamic Island.
 */
export function headerPaddingTop(safeAreaTop: number): number {
  return safeAreaTop + 14;
}
