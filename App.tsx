import './global.css';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initI18n } from './src/i18n';
import { useAuth } from './src/hooks/useAuth';
import { AuthNavigator, MainNavigator } from './src/navigation/AppNavigator';
import { AppAlertModalHost } from './src/components/AppAlertModalHost';

const AppContent: React.FC = () => {
  const { session, profile, loading, signIn, signUp, signOut, isAdmin } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!session || !profile) {
    return <AuthNavigator onLogin={signIn} onRegister={signUp} />;
  }

  return (
    <MainNavigator profile={profile} isAdmin={isAdmin} onLogout={signOut} />
  );
};

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
      <AppAlertModalHost />
    </SafeAreaProvider>
  );
}
