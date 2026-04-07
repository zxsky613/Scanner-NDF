import i18n from '../i18n';

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
