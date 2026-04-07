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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthLanguagePicker } from '../../components/AuthLanguagePicker';
import { showAppAlert } from '../../utils/alert';

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
      showAppAlert(t('auth.popupLoginIncompleteTitle'), t('auth.popupLoginIncompleteBody'));
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
        showAppAlert(t('auth.loginFailedTitle'), detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 relative bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8 pb-12 w-full items-center">
          <View className="w-full max-w-md self-center">
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-primary-600 rounded-2xl items-center justify-center mb-4">
                <Text className="text-white text-3xl font-bold">NF</Text>
              </View>
              <Text className="text-3xl font-bold text-gray-900">
                {t('common.appName')}
              </Text>
              <Text className="text-gray-500 mt-2 text-base">
                {t('auth.loginTitle')}
              </Text>
            </View>

            <View className="mb-4 w-full">
              <Text className="text-gray-700 font-medium mb-2">{t('auth.email')}</Text>
              <TextInput
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.password')}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              className={`w-full rounded-xl py-4 items-center ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
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
