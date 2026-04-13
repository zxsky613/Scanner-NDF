import React, { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { showAppConfirm } from '../../utils/alert';
import { Profile, SupportedLanguage } from '../../types';
import { theme, headerPaddingTop, heroHeaderShadow } from '../../config/theme';
import { AppNameText } from '../../components/AppNameText';
import { ScreenHeroTitle } from '../../components/ScreenHeroTitle';
import { userRoleLabel } from '../../utils/userRoleLabel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IS_WEB,
  WEB_HERO_CARD_CLASS,
  WEB_PAGE_GUTTER_CLASS,
  webHeroCardInlineStyle,
  webHeaderOuterInlineStyle,
} from '../../config/webLayout';

interface Props {
  profile: Profile;
  onLogout: () => Promise<void>;
}

const languages: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

/** Sur le web, les emoji-drapeaux sont souvent non rendus (ex. Windows) ; images fiables. */
const LANGUAGE_FLAG_URI: Record<SupportedLanguage, string> = {
  fr: 'https://flagcdn.com/w40/fr.png',
  en: 'https://flagcdn.com/w40/gb.png',
  zh: 'https://flagcdn.com/w40/cn.png',
};

function LanguageFlagIcon({ code, emoji }: { code: SupportedLanguage; emoji: string }) {
  if (IS_WEB) {
    return (
      <Image
        source={{ uri: LANGUAGE_FLAG_URI[code] }}
        style={{ width: 32, height: 22, borderRadius: 3, marginRight: 12 }}
        resizeMode="cover"
        accessibilityLabel={emoji}
      />
    );
  }
  return <Text className="text-2xl mr-3">{emoji}</Text>;
}

export const SettingsScreen: React.FC<Props> = ({ profile, onLogout }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const pageX = IS_WEB ? WEB_PAGE_GUTTER_CLASS : 'px-5';

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
      <View
        className={`${pageX} ${IS_WEB ? '' : 'pb-2'}`}
        style={[
          { paddingTop: headerPaddingTop(insets.top) },
          IS_WEB ? webHeaderOuterInlineStyle : { paddingBottom: 8 },
        ]}
      >
        <View
          className={IS_WEB ? `${WEB_HERO_CARD_CLASS} overflow-hidden` : 'rounded-[28px] px-6 py-6'}
          style={[
            {
              backgroundColor: theme.heroHeaderBg,
              borderWidth: 1,
              borderColor: theme.heroHeaderBorder,
              ...heroHeaderShadow,
            },
            IS_WEB ? webHeroCardInlineStyle : null,
          ]}
        >
          <AppNameText
            className={
              IS_WEB
                ? 'text-ink-300 text-[10px] uppercase tracking-[0.16em]'
                : 'text-ink-300 text-xs uppercase tracking-[0.14em]'
            }
          >
            {t('common.appName')}
          </AppNameText>
          <ScreenHeroTitle className={IS_WEB ? 'mt-1' : 'mt-2'}>{t('navTabs.settings')}</ScreenHeroTitle>
        </View>
      </View>

      <View className={`${pageX} ${IS_WEB ? 'mt-3' : 'mt-4'}`}>
        <View
          className="bg-white rounded-[28px] px-6 py-8 items-center border border-gray-100/80 shadow-sm mb-5"
          style={{
            shadowColor: theme.brandPrimary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 20,
            elevation: 4,
          }}
        >
          <View className="w-24 h-24 bg-ink rounded-full items-center justify-center mb-4 shadow-lg">
            <Text className="text-white text-4xl font-bold">
              {profile.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text
            className="text-2xl font-bold text-center"
            style={{ color: theme.brandInk }}
          >
            {profile.full_name}
          </Text>
          <Text className="text-gray-400 text-sm mt-2 text-center">{profile.email}</Text>
          <View className="bg-primary-50 border border-primary-100 rounded-full px-5 py-1.5 mt-3">
            <Text className="text-primary-700 text-sm font-bold">{userRoleLabel(profile.role, t)}</Text>
          </View>
        </View>
      </View>

      <View className={pageX}>
        {/* Language selector */}
        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
          <Text className="font-bold text-base mb-4" style={{ color: theme.brandInk }}>
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
                <LanguageFlagIcon code={lang.code} emoji={lang.flag} />
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
          <Text className="font-bold text-base mb-4" style={{ color: theme.brandInk }}>
            {t('settings.profile')}
          </Text>
          <InfoRow label={t('auth.fullName')} value={profile.full_name} />
          <InfoRow label={t('auth.email')} value={profile.email} />
          <InfoRow label={t('auth.roleLabel')} value={userRoleLabel(profile.role, t)} />
          {profile.department && (
            <InfoRow label={t('settings.department')} value={profile.department} />
          )}
        </View>

        {/* About */}
        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
          <Text className="font-bold text-base mb-4" style={{ color: theme.brandInk }}>
            {t('settings.about')}
          </Text>
          <InfoRow
            label={t('settings.applicationLabel')}
            value={
              <AppNameText className="text-ink text-base">
                {t('common.appName')}
              </AppNameText>
            }
          />
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

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <View className="flex-row justify-between py-3 border-b border-gray-50">
    <Text className="text-gray-500">{label}</Text>
    {typeof value === 'string' ? (
      <Text className="font-medium" style={{ color: theme.brandInk }}>
        {value}
      </Text>
    ) : (
      <View className="max-w-[55%] items-end">{value}</View>
    )}
  </View>
);
