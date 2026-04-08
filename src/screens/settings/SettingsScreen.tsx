import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { showAppConfirm } from '../../utils/alert';
import { Profile, SupportedLanguage } from '../../types';
import { theme, headerPaddingTop } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
  };

  const handleLogout = async () => {
    const ok = await showAppConfirm(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      t('common.cancel'),
      t('common.confirm'),
      { destructive: true }
    );
    if (ok) await onLogout();
  };

  return (
    <ScrollView className="flex-1 bg-surface">
      <View className="px-5 pb-2" style={{ paddingTop: headerPaddingTop(insets.top) }}>
        <View
          className="bg-white rounded-[28px] px-6 py-8 items-center border border-gray-100/80 shadow-sm"
          style={{
            shadowColor: theme.brandPrimary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 20,
            elevation: 4,
          }}
        >
          <View className="w-24 h-24 bg-primary-600 rounded-full items-center justify-center mb-4 shadow-lg">
            <Text className="text-white text-4xl font-bold">
              {profile.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-gray-900 text-2xl font-bold text-center">{profile.full_name}</Text>
          <Text className="text-gray-400 text-sm mt-2 text-center">{profile.email}</Text>
          <View className="bg-primary-50 border border-primary-100 rounded-full px-5 py-1.5 mt-3">
            <Text className="text-primary-700 text-sm font-bold capitalize">{profile.role}</Text>
          </View>
        </View>
      </View>

      <View className="px-5 mt-5">
        {/* Language selector */}
        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
          <Text className="text-gray-900 font-bold text-base mb-4">
            {t('settings.language')}
          </Text>
          <View className="gap-2">
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                className={`flex-row items-center p-4 rounded-2xl border ${
                  i18n.language === lang.code
                    ? 'bg-primary-50 border-primary-500'
                    : 'bg-surface border-gray-100'
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
        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
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
        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
          <Text className="text-gray-900 font-bold text-base mb-4">
            {t('settings.about')}
          </Text>
          <InfoRow label={t('common.appName')} value="ExpenseApp" />
          <InfoRow label={t('settings.version')} value="1.0.0" />
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 border border-red-100 rounded-full py-4 items-center mb-12"
          onPress={handleLogout}
        >
          <Text className="text-red-600 font-bold text-base">{t('auth.logout')}</Text>
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
