import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { Profile, SupportedLanguage } from '../../types';

interface Props {
  profile: Profile;
  onLogout: () => Promise<void>;
}

const languages: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

export const SettingsScreen: React.FC<Props> = ({ profile, onLogout }) => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-primary-600 pt-14 pb-8 px-6 rounded-b-3xl items-center">
        <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-3">
          <Text className="text-white text-3xl font-bold">
            {profile.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-white text-xl font-bold">{profile.full_name}</Text>
        <Text className="text-primary-200 mt-1">{profile.email}</Text>
        <View className="bg-white/20 rounded-full px-4 py-1 mt-2">
          <Text className="text-white text-sm font-medium capitalize">{profile.role}</Text>
        </View>
      </View>

      <View className="px-4 mt-6">
        {/* Language selector */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
          <Text className="text-gray-900 font-bold text-base mb-4">
            {t('settings.language')}
          </Text>
          <View className="gap-2">
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                className={`flex-row items-center p-4 rounded-xl border ${
                  i18n.language === lang.code
                    ? 'bg-primary-50 border-primary-500'
                    : 'bg-gray-50 border-gray-200'
                }`}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text className="text-2xl mr-3">{lang.flag}</Text>
                <Text
                  className={`font-medium text-base flex-1 ${
                    i18n.language === lang.code ? 'text-primary-700' : 'text-gray-700'
                  }`}
                >
                  {lang.label}
                </Text>
                {i18n.language === lang.code && (
                  <Text className="text-primary-600 font-bold">✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Profile info */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
          <Text className="text-gray-900 font-bold text-base mb-4">
            {t('settings.profile')}
          </Text>
          <InfoRow label={t('auth.fullName')} value={profile.full_name} />
          <InfoRow label={t('auth.email')} value={profile.email} />
          <InfoRow label="Rôle" value={profile.role} />
          {profile.department && (
            <InfoRow label="Département" value={profile.department} />
          )}
        </View>

        {/* About */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
          <Text className="text-gray-900 font-bold text-base mb-4">
            {t('settings.about')}
          </Text>
          <InfoRow label={t('common.appName')} value="ExpenseApp" />
          <InfoRow label={t('settings.version')} value="1.0.0" />
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 border border-red-200 rounded-2xl py-4 items-center mb-10"
          onPress={handleLogout}
        >
          <Text className="text-red-600 font-semibold text-base">{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-3 border-b border-gray-50">
    <Text className="text-gray-500">{label}</Text>
    <Text className="text-gray-900 font-medium">{value}</Text>
  </View>
);
