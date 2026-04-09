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
import { BrandLogo } from '../../components/BrandLogo';
import { AppNameText } from '../../components/AppNameText';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthLanguagePicker } from '../../components/AuthLanguagePicker';
import { showAppAlert } from '../../utils/alert';
import { theme } from '../../config/theme';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  onLogin: (email: string, password: string) => Promise<{ error: any }>;
}

export const LoginScreen: React.FC<Props> = ({ navigation, onLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAppAlert(t('auth.popupLoginIncompleteTitle'), t('auth.popupLoginIncompleteBody'), 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await onLogin(email.trim(), password);
      if (error) {
        const code =
          typeof (error as { message?: string })?.message === 'string'
            ? (error as { message: string }).message
            : '';
        let detail = code;
        if (code === 'REQUEST_TIMEOUT') {
          detail = t('auth.requestTimeout');
        } else if (code === 'PROFILE_MISSING') {
          detail = t('auth.profileMissing');
        } else if (code === 'EMAIL_OR_SESSION_MISSING') {
          detail = t('auth.emailNotConfirmed');
        } else if (
          code.toLowerCase().includes('email not confirmed') ||
          code.toLowerCase().includes('not confirmed')
        ) {
          detail = t('auth.emailNotConfirmed');
        } else if (
          code.toLowerCase().includes('invalid api key') ||
          code.toLowerCase().includes('no api key found')
        ) {
          detail = t('auth.invalidSupabaseKey');
        } else if (!code || code === 'Invalid login credentials') {
          detail = t('auth.loginError');
        }
        showAppAlert(t('auth.loginFailedTitle'), detail, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 relative bg-surface"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8 pb-12 w-full items-center">
          <View className="w-full max-w-md self-center">
            <View className="items-center mb-10">
              <BrandLogo size={100} />
              <AppNameText className="text-3xl text-ink tracking-[-0.02em] mt-1">
                {t('common.appName')}
              </AppNameText>
              <Text className="text-gray-400 mt-1 text-base">
                {t('auth.loginTitle')}
              </Text>
            </View>

            <View className="mb-4 w-full">
              <Text className="text-gray-700 font-medium mb-2">{t('auth.email')}</Text>
              <TextInput
                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 text-base text-gray-900"
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="mb-6 w-full">
              <Text className="text-gray-700 font-medium mb-2">{t('auth.password')}</Text>
              <TextInput
                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-4 text-base text-gray-900"
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.password')}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              className={`w-full rounded-full py-4 items-center ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
              onPress={handleLogin}
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
                  {t('auth.login')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-6 items-center w-full"
              onPress={() => navigation.navigate('Register')}
            >
              <Text className="text-primary-600 text-base text-center">
                {t('auth.noAccount')}{' '}
                <Text className="font-semibold">{t('auth.register')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <AuthLanguagePicker />
    </KeyboardAvoidingView>
  );
};
