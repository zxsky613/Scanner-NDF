import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserRole } from '../../types';
import { AuthLanguagePicker } from '../../components/AuthLanguagePicker';
import { BrandLogo } from '../../components/BrandLogo';
import { AppNameText } from '../../components/AppNameText';
import { showAppAlert } from '../../utils/alert';
import { isEmailAlreadyRegisteredError } from '../../utils/authErrors';
import { theme, headerPaddingTop } from '../../config/theme';
import { FINANCE_REGISTRATION_ACCESS_CODE } from '../../config/financeRegistration';
import { IS_WEB } from '../../config/webLayout';

const REGISTER_ROLE_OPTIONS: UserRole[] = ['employee', 'sales', 'finance'];
const REGISTER_ROLE_ICONS: Record<UserRole, string> = {
  employee: '👤',
  sales: '💼',
  finance: '💰',
};

interface Props {
  navigation: NativeStackNavigationProp<any>;
  onRegister: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<{ error: any }>;
}

export const RegisterScreen: React.FC<Props> = ({ navigation, onRegister }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);

  const setRoleAndResetCode = (r: UserRole) => {
    setRole(r);
    if (r !== 'finance') setAccessCode('');
  };

  const handleRegister = async () => {
    const given = firstName.trim();
    const family = lastName.trim();
    const mail = email.trim();

    if (!given || !family || !mail || !password) {
      showAppAlert(t('auth.popupIncompleteTitle'), t('auth.popupIncompleteBody'), 'error');
      return;
    }

    if (password.length < 6) {
      showAppAlert(t('auth.popupPasswordTitle'), t('auth.popupPasswordBody'), 'error');
      return;
    }

    if (role === 'finance') {
      const code = accessCode.trim();
      if (!code) {
        showAppAlert(t('auth.accessCodeMissingTitle'), t('auth.accessCodeMissingBody'), 'error');
        return;
      }
      if (code !== FINANCE_REGISTRATION_ACCESS_CODE.trim()) {
        showAppAlert(t('auth.invalidAccessCodeTitle'), t('auth.invalidAccessCodeBody'), 'error');
        return;
      }
    }

    const fullName = `${given} ${family}`;
    setLoading(true);
    try {
      const { error } = await onRegister(mail, password, fullName, role);
      if (error) {
        if (isEmailAlreadyRegisteredError(error)) {
          showAppAlert(t('auth.popupEmailExistsTitle'), t('auth.popupEmailExistsBody'), 'error');
          return;
        }
        const raw =
          typeof error?.message === 'string' && error.message ? error.message : '';
        const detail =
          raw.toLowerCase().includes('invalid api key') ||
          raw.toLowerCase().includes('no api key found')
            ? t('auth.invalidSupabaseKey')
            : raw || t('auth.registerError');
        showAppAlert(t('auth.registerError'), detail, 'error');
        return;
      }
      showAppAlert(t('common.success'), t('auth.registerSuccess'), 'success', () =>
        navigation.goBack()
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 relative bg-surface"
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute left-5 z-10"
        style={{ top: insets.top + 6 }}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Text className="text-primary-600 text-base font-bold">← {t('common.back')}</Text>
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          /** Sous l’îlot / encoche : évite de centrer verticalement un long formulaire (logo remonté). */
          paddingTop: headerPaddingTop(insets.top) + 36,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className={`pb-12 w-full items-center ${IS_WEB ? 'px-10' : 'px-8'}`}>
          <View
            className={`w-full max-w-md self-center ${
              IS_WEB
                ? 'rounded-[28px] bg-white border border-gray-200/70 px-8 py-10 shadow-xl'
                : ''
            }`}
          >
            <View className="items-center mb-10">
              <BrandLogo size={88} />
              <AppNameText className="text-2xl text-ink text-center mt-1 tracking-[-0.02em]">
                {t('common.appName')}
              </AppNameText>
              <Text className="text-lg font-semibold text-gray-600 mt-1 text-center">
                {t('auth.registerTitle')}
              </Text>
            </View>

            <View className="flex-row gap-3 mb-4 w-full">
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">{t('auth.firstName')}</Text>
                <TextInput
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('auth.firstName')}
                  autoCapitalize="words"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">{t('auth.lastName')}</Text>
                <TextInput
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t('auth.lastName')}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View className="mb-4 w-full">
              <Text className="text-gray-700 font-medium mb-2">{t('auth.email')}</Text>
              <TextInput
                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900"
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mb-4 w-full">
              <Text className="text-gray-700 font-medium mb-2">{t('auth.password')}</Text>
              <TextInput
                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900"
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.password')}
                secureTextEntry
              />
            </View>

            <View className={`w-full ${role === 'finance' ? 'mb-4' : 'mb-6'}`}>
              <Text className="text-gray-700 font-medium mb-3">{t('auth.roleLabel')}</Text>
              <View className="flex-row flex-wrap gap-2 w-full justify-center">
                {REGISTER_ROLE_OPTIONS.map(rValue => (
                  <TouchableOpacity
                    key={rValue}
                    className={`min-w-[30%] flex-grow max-w-[48%] py-3.5 px-2 rounded-full items-center border ${
                      role === rValue
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-white border-gray-100'
                    }`}
                    onPress={() => setRoleAndResetCode(rValue)}
                  >
                    <Text
                      className={`font-medium text-xs text-center ${
                        role === rValue ? 'text-white' : 'text-gray-700'
                      }`}
                      numberOfLines={2}
                    >
                      {`${REGISTER_ROLE_ICONS[rValue]} ${t(`roles.${rValue}`)}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {role === 'finance' ? (
              <View className="mb-6 w-full">
                <Text className="text-gray-700 font-medium mb-2">{t('auth.accessCodeLabel')}</Text>
                <TextInput
                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900"
                  value={accessCode}
                  onChangeText={setAccessCode}
                  placeholder={t('auth.accessCodePlaceholderFinance')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                />
                <Text className="text-gray-500 text-xs mt-2 leading-4">{t('auth.accessCodeHint')}</Text>
              </View>
            ) : null}

            <Text className="text-gray-500 text-xs text-center mb-2 leading-5">{t('auth.legalRegisterLead')}</Text>
            <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-2 mb-5">
              {(
                [
                  ['mentions', 'legal.openMentions'],
                  ['privacy', 'legal.openPrivacy'],
                  ['terms', 'legal.openTerms'],
                ] as const
              ).map(([kind, labelKey]) => (
                <TouchableOpacity
                  key={kind}
                  onPress={() => navigation.navigate('LegalDocument', { kind })}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text className="text-primary-600 text-xs font-semibold underline">{t(labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className={`w-full rounded-full py-4 items-center ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
              onPress={handleRegister}
              disabled={loading}
              style={
                loading
                  ? undefined
                  : {
                      shadowColor: theme.brandPrimary,
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.35,
                      shadowRadius: 14,
                      elevation: 8,
                    }
              }
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {t('auth.register')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-6 items-center w-full"
              onPress={() => navigation.goBack()}
            >
              <Text className="text-primary-600 text-base text-center">
                {t('auth.hasAccount')}{' '}
                <Text className="font-semibold">{t('auth.login')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <AuthLanguagePicker />
    </KeyboardAvoidingView>
  );
};
