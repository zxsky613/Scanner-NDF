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
import { UserRole } from '../../types';
import { AuthLanguagePicker } from '../../components/AuthLanguagePicker';
import { showAppAlert } from '../../utils/alert';
import { isEmailAlreadyRegisteredError } from '../../utils/authErrors';

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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [loading, setLoading] = useState(false);

  const roles: { value: UserRole; label: string }[] = [
    { value: 'employee', label: '👤 ' + t('admin.employee') },
    { value: 'manager', label: '👔 Manager' },
    { value: 'finance', label: '💰 Finance' },
  ];

  const handleRegister = async () => {
    const given = firstName.trim();
    const family = lastName.trim();
    const mail = email.trim();

    if (!given || !family || !mail || !password) {
      showAppAlert(t('auth.popupIncompleteTitle'), t('auth.popupIncompleteBody'));
      return;
    }

    if (password.length < 6) {
      showAppAlert(t('auth.popupPasswordTitle'), t('auth.popupPasswordBody'));
      return;
    }

    const fullName = `${given} ${family}`;
    setLoading(true);
    try {
      const { error } = await onRegister(mail, password, fullName, role);
      if (error) {
        if (isEmailAlreadyRegisteredError(error)) {
          showAppAlert(t('auth.popupEmailExistsTitle'), t('auth.popupEmailExistsBody'));
          return;
        }
        const raw =
          typeof error?.message === 'string' && error.message ? error.message : '';
        const detail =
          raw.toLowerCase().includes('invalid api key') ||
          raw.toLowerCase().includes('no api key found')
            ? t('auth.invalidSupabaseKey')
            : raw || t('auth.registerError');
        showAppAlert(t('auth.registerError'), detail);
        return;
      }
      showAppAlert(t('common.success'), t('auth.registerSuccess'));
      navigation.goBack();
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
              <Text className="text-3xl font-bold text-gray-900">
                {t('auth.registerTitle')}
              </Text>
            </View>

            <View className="flex-row gap-3 mb-4 w-full">
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">{t('auth.firstName')}</Text>
                <TextInput
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('auth.firstName')}
                  autoCapitalize="words"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-2">{t('auth.lastName')}</Text>
                <TextInput
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.password')}
                secureTextEntry
              />
            </View>

            <View className="mb-6 w-full">
              <Text className="text-gray-700 font-medium mb-3">{t('auth.roleLabel')}</Text>
              <View className="flex-row gap-2 w-full">
                {roles.map(r => (
                  <TouchableOpacity
                    key={r.value}
                    className={`flex-1 py-3 rounded-xl items-center border ${
                      role === r.value
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onPress={() => setRole(r.value)}
                  >
                    <Text
                      className={`font-medium text-sm ${
                        role === r.value ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              className={`w-full rounded-xl py-4 items-center ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
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
