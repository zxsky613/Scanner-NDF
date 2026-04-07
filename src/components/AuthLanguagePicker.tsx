import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';
import { SupportedLanguage } from '../types';

const LANGS: { code: SupportedLanguage; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
];

export const AuthLanguagePicker: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-3 z-20 flex-row items-center gap-1"
      style={{ bottom }}
      accessibilityLabel={t('auth.chooseLanguage')}
    >
      {LANGS.map(({ code, label }) => {
        const active = i18n.language === code;
        return (
          <TouchableOpacity
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${t('auth.chooseLanguage')}: ${label}`}
            onPress={() => changeLanguage(code)}
            className={`px-2 py-1 rounded-md border ${
              active
                ? 'bg-primary-50 border-primary-200'
                : 'bg-white/80 border-gray-200'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-[11px] font-medium ${
                active ? 'text-primary-700' : 'text-gray-400'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
