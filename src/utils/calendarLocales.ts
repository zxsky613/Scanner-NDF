import { LocaleConfig } from 'react-native-calendars';

export type CalendarXLocale = {
  monthNames: string[];
  monthNamesShort: string[];
  dayNames: string[];
  dayNamesShort: string[];
  amDesignator: string;
  pmDesignator: string;
};

export const FR_CAL: CalendarXLocale = {
  monthNames: [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ],
  monthNamesShort: [
    'Janv.',
    'Févr.',
    'Mars',
    'Avr.',
    'Mai',
    'Juin',
    'Juil.',
    'Août',
    'Sept.',
    'Oct.',
    'Nov.',
    'Déc.',
  ],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
  amDesignator: 'AM',
  pmDesignator: 'PM',
};

export const ZH_CAL: CalendarXLocale = {
  monthNames: [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月',
  ],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  dayNamesShort: ['日', '一', '二', '三', '四', '五', '六'],
  amDesignator: '上午',
  pmDesignator: '下午',
};

/** Aligner react-native-calendars sur la langue i18n (fr / en / zh). */
export function syncCalendarLocale(i18nLanguage: string): void {
  const loc = LocaleConfig.locales as Record<string, CalendarXLocale>;
  if (!loc.fr) loc.fr = FR_CAL;
  if (!loc.zh) loc.zh = ZH_CAL;
  const base = (i18nLanguage || 'fr').split('-')[0];
  if (base === 'zh') LocaleConfig.defaultLocale = 'zh';
  else if (base === 'en') LocaleConfig.defaultLocale = '';
  else LocaleConfig.defaultLocale = 'fr';
}
