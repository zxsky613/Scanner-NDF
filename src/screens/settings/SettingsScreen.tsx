import React, { type ReactNode, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { changeLanguage } from '../../i18n';
import { showAppAlert, showAppConfirm } from '../../utils/alert';
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
import type { LegalDocKind } from '../legal/LegalDocumentScreen';
import { mobileTabBarScrollPadding } from '../../config/constants';

type SettingsStackNav = NativeStackNavigationProp<{
  SettingsHome: undefined;
  LegalDocument: { kind: LegalDocKind };
}>;

interface Props {
  profile: Profile;
  onLogout: () => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  onDeleteAccount: () => Promise<{ error: string | null }>;
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

export const SettingsScreen: React.FC<Props> = ({ profile, onLogout, onChangePassword, onDeleteAccount }) => {
  const navigation = useNavigation<SettingsStackNav>();
  const insets = useSafeAreaInsets();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const { t, i18n } = useTranslation();
  const pageX = IS_WEB ? WEB_PAGE_GUTTER_CLASS : 'px-5';
  const legalKinds: LegalDocKind[] = ['mentions', 'privacy', 'terms'];

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

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);
  };

  const closePasswordModal = () => {
    if (changingPassword) return;
    setPasswordModalVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showAppAlert(t('common.error'), t('auth.currentPasswordRequired'), 'error');
      return;
    }
    if (newPassword.length < 6) {
      showAppAlert(t('common.error'), t('auth.passwordTooShort'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAppAlert(t('common.error'), t('auth.passwordMismatch'), 'error');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await onChangePassword(currentPassword, newPassword);
      if (error === 'INVALID_CURRENT_PASSWORD') {
        showAppAlert(t('common.error'), t('auth.invalidCurrentPassword'), 'error');
        return;
      }
      if (error) {
        showAppAlert(t('common.error'), `${t('auth.changePasswordError')}\n\n${error}`, 'error');
        return;
      }
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showAppAlert(t('common.success'), t('auth.changePasswordSuccess'), 'success');
    } finally {
      setChangingPassword(false);
    }
  };

  const scrollStyle: StyleProp<ViewStyle> = [
    { flex: 1, backgroundColor: theme.surface },
    Platform.OS === 'web' ? { minHeight: 0 } : null,
  ];

  const scrollContentStyle: StyleProp<ViewStyle> = {
    paddingBottom:
      Math.max(insets.bottom, 12) +
      (IS_WEB ? 48 : mobileTabBarScrollPadding() + 20),
    ...(IS_WEB ? { flexGrow: 1 as const } : {}),
  };

  const handleDeleteAccount = async () => {
    const first = await showAppConfirm(
      t('auth.deleteAccountTitle'),
      t('auth.deleteAccountMessage'),
      t('common.cancel'),
      t('auth.deleteAccountConfirmButton'),
      { destructive: true }
    );
    if (!first) return;

    const second = await showAppConfirm(
      t('auth.deleteAccountTitle'),
      t('auth.deleteAccountConfirmFinal'),
      t('common.cancel'),
      t('auth.deleteAccountConfirmButton'),
      { destructive: true }
    );
    if (!second) return;

    setDeletingAccount(true);
    try {
      const { error } = await onDeleteAccount();
      if (error) {
        showAppAlert(t('common.error'), `${t('auth.deleteAccountErrorDetail')}\n\n${error}`, 'error');
      } else {
        showAppAlert(t('common.success'), t('auth.deleteAccountSuccess'), 'success');
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <>
    <ScrollView
      className="flex-1 bg-surface"
      style={scrollStyle}
      contentContainerStyle={scrollContentStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
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

        {/* Change password */}
        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
          <Text className="font-bold text-base mb-2" style={{ color: theme.brandInk }}>
            {t('settings.changePasswordSection')}
          </Text>
          <Text className="text-gray-500 text-sm mb-4 leading-5">{t('settings.changePasswordHint')}</Text>
          <TouchableOpacity
            className="rounded-full py-3.5 items-center border border-primary-200 bg-primary-50 active:opacity-80"
            onPress={openPasswordModal}
            accessibilityRole="button"
            accessibilityLabel={t('settings.changePasswordButton')}
          >
            <Text className="text-primary-700 font-bold text-base">{t('settings.changePasswordButton')}</Text>
          </TouchableOpacity>
        </View>

        <View
          className="bg-white rounded-[22px] p-5 mb-4 border border-red-100 shadow-sm"
          style={IS_WEB ? ({ minHeight: 120 } satisfies ViewStyle) : undefined}
        >
          <Text className="font-bold text-base mb-2" style={{ color: theme.brandInk }}>
            {t('settings.deleteAccountSection')}
          </Text>
          <Text className="text-gray-500 text-sm mb-4 leading-5">{t('settings.deleteAccountHint')}</Text>
          <TouchableOpacity
            className="rounded-full py-3.5 items-center border border-red-200 bg-red-50 active:opacity-80"
            onPress={() => void handleDeleteAccount()}
            disabled={deletingAccount}
            accessibilityRole="button"
            accessibilityLabel={t('settings.deleteAccountButton')}
          >
            {deletingAccount ? (
              <ActivityIndicator color={theme.brandPrimary} />
            ) : (
              <Text className="text-red-600 font-bold text-base">{t('settings.deleteAccountButton')}</Text>
            )}
          </TouchableOpacity>
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
          <InfoRow label={t('settings.version')} value="1.0.2" />
        </View>

        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
          <Text className="font-bold text-base mb-4" style={{ color: theme.brandInk }}>
            {t('legal.sectionTitle')}
          </Text>
          {legalKinds.map((kind, i) => (
            <TouchableOpacity
              key={kind}
              className={`flex-row items-center justify-between py-3.5 ${
                i < legalKinds.length - 1 ? 'border-b border-gray-50' : ''
              }`}
              onPress={() => navigation.navigate('LegalDocument', { kind })}
              accessibilityRole="button"
              accessibilityLabel={t(`legal.documents.${kind}.title`)}
            >
              <Text className="text-gray-800 font-medium text-base pr-2 flex-1">
                {t(`legal.documents.${kind}.title`)}
              </Text>
              <Ionicons name="chevron-forward" size={22} color={theme.inkMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 border border-red-100 rounded-full py-4 items-center mb-12"
          onPress={handleLogout}
          disabled={deletingAccount}
        >
          <Text className="text-red-600 font-bold text-base">{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

    <Modal
      visible={passwordModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closePasswordModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full max-w-md bg-white rounded-[24px] p-6">
            <Text className="font-bold text-lg mb-1" style={{ color: theme.brandInk }}>
              {t('settings.changePasswordButton')}
            </Text>
            <Text className="text-gray-500 text-sm mb-5 leading-5">
              {t('settings.changePasswordHint')}
            </Text>
            <TextInput
              className="w-full bg-surface border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900 mb-3"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t('auth.currentPassword')}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              className="w-full bg-surface border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900 mb-3"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('auth.newPassword')}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              className="w-full bg-surface border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900 mb-5"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.confirmPassword')}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="rounded-full py-3.5 items-center bg-primary-600 active:opacity-80 mb-3"
              onPress={() => void handleChangePassword()}
              disabled={changingPassword}
              accessibilityRole="button"
              accessibilityLabel={t('settings.changePasswordButton')}
            >
              {changingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">{t('settings.changePasswordButton')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="py-3 items-center"
              onPress={closePasswordModal}
              disabled={changingPassword}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Text className="text-gray-500 font-medium text-base">{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
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
