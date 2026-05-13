import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { showAppAlert } from '../utils/alert';

/** Indique où supprimer le compte une fois connecté (lisibilité pour les stores / Guideline 5.1.1(v)). */
export function AuthDeleteAccountHelpLink() {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      className="mt-4 mb-1 items-center w-full px-2"
      onPress={() =>
        showAppAlert(t('auth.deleteAccountHelpTitle'), t('auth.deleteAccountHelpBody'), 'default')
      }
      accessibilityRole="button"
      accessibilityLabel={`${t('auth.deleteAccountHelpTitle')}. ${t('auth.deleteAccountHelpBody')}`}
    >
      <Text className="text-gray-600 text-xs text-center underline">{t('auth.deleteAccountHelpLink')}</Text>
    </TouchableOpacity>
  );
}
