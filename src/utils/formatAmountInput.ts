/**
 * Saisie de montants : espaces tous les 3 chiffres (partie entière) pour la lisibilité.
 * Décimales : une virgule ou un point comme séparateur (le dernier caractère , ou .).
 */

export function parseLocaleAmount(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '' || t === '.' ) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function formatAmountThousandsSpaces(raw: string): string {
  if (!raw) return '';
  const compact = raw.replace(/\s/g, '');
  if (compact === '') return '';

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  const sepIndex = Math.max(lastComma, lastDot);

  if (sepIndex >= 0) {
    const sepChar = sepIndex === lastComma ? (',' as const) : ('.' as const);
    const intDigits = compact.slice(0, sepIndex).replace(/\D/g, '');
    const decDigits = compact.slice(sepIndex + 1).replace(/\D/g, '');
    const intFormatted = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (decDigits.length > 0) {
      return `${intFormatted}${sepChar}${decDigits}`;
    }
    if (compact.endsWith(',') || compact.endsWith('.')) {
      return `${intFormatted}${sepChar}`;
    }
    return intFormatted;
  }

  const intDigits = compact.replace(/\D/g, '');
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Valeur initiale depuis un nombre (édition projet, etc.). */
export function formatAmountThousandsFromNumber(value: number): string {
  if (value == null || Number.isNaN(value)) return '';
  return formatAmountThousandsSpaces(String(value));
}

/** Montants HT/TTC (2 décimales) + espaces milliers — chargement formulaire note de frais. */
export function formatMoneyInputInitial(amount: number): string {
  if (amount == null || Number.isNaN(amount)) return '';
  const rounded = Math.round(amount * 100) / 100;
  return formatAmountThousandsSpaces(rounded.toFixed(2));
}
