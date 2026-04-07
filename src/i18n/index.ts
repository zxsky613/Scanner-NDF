import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  zh: { translation: zh },
};

const getStoredLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored && ['fr', 'en', 'zh'].includes(stored)) return stored;
  } catch {}
  const deviceLang = getLocales()[0]?.languageCode ?? 'fr';
  if (deviceLang.startsWith('zh')) return 'zh';
  if (deviceLang.startsWith('en')) return 'en';
  return 'fr';
};

export const initI18n = async () => {
  const lng = await getStoredLanguage();
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
};

export const changeLanguage = async (lang: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

export default i18n;
