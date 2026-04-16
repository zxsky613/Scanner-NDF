/**
 * Identité de l’éditeur — données injectées dans les mentions légales et politiques (interpolation i18n).
 * Mettez à jour `documentsLastUpdated` à chaque modification substantielle des textes ou de ces champs.
 */
export const LEGAL_PUBLISHER = {
  tradeName: "DABAR's",
  companyName: 'DABAR',
  legalForm: 'SAS',
  addressLine: '66 avenue des Champs-Élysées, 75008 Paris',
  country: 'France',
  /** SIRET 14 chiffres ; SIREN = 833 974 025 */
  registrationNumber: 'SIRET 833 974 025 00029 — RCS Paris',
  vatNumber: 'FR20833974025',
  contactEmail: 'contact@dabarfrance.com',
  publicationDirector: 'Zhikai ZHONG',
  hostName: 'Supabase, Inc.',
  /** Siège social du prestataire d’hébergement (transparence) ; les données métier sont stockées en région UE — voir textes légaux. */
  hostAddress: '970 Toa Payoh North #07-04, Singapore 318984',
  hostWebsite: 'https://supabase.com',
  /**
   * Date affichée comme « dernière mise à jour » (modifiez ce libellé quand vous changez les documents ou ces infos).
   * Affiché tel quel dans chaque langue pour l’instant ; vous pouvez harmoniser (ex. ISO 2026-04-15) si vous préférez.
   */
  documentsLastUpdated: '15 avril 2026',
} as const;

export function getLegalInterpolation(): Record<string, string> {
  return { ...LEGAL_PUBLISHER };
}
