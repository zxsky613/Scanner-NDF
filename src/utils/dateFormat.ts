import i18n from '../i18n';

/** Saisie JJ/MM/AAAA : uniquement les chiffres, les « / » sont ajoutés automatiquement. */
export const maskDateDMY = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += '/';
    out += digits[i];
  }
  return out;
};

/** YYYY-MM-DD → DD/MM/YYYY pour affichage dans le champ. */
export const isoToDmyInput = (iso: string): string => {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
};

/** DD/MM/YYYY complet → YYYY-MM-DD pour API / base, ou null si invalide. */
export const dmyInputToIso = (dmy: string): string | null => {
  const m = dmy.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || dd < 1 || dd > 31) return null;
  const date = new Date(yyyy, mo - 1, dd);
  if (
    date.getFullYear() !== yyyy ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }
  return `${yyyy}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  const lang = i18n.language;
  switch (lang) {
    case 'zh':
      return `${year}/${month}/${day}`;
    case 'en':
      return `${month}/${day}/${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

export const formatCurrency = (amount: number): string => {
  const lang = i18n.language;
  const formatted = amount.toFixed(2);
  switch (lang) {
    case 'en':
      return `€${formatted}`;
    case 'zh':
      return `€${formatted}`;
    default:
      return `${formatted} €`;
  }
};

export const toISODate = (dateStr: string): string => {
  const parts = dateStr.split('/');
  const lang = i18n.language;
  switch (lang) {
    case 'zh':
      return `${parts[0]}-${parts[1]}-${parts[2]}`;
    case 'en':
      return `${parts[2]}-${parts[0]}-${parts[1]}`;
    default:
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
};
