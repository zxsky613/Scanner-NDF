import './global.css';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initI18n } from './src/i18n';
import { theme } from './src/config/theme';
import { applyPoppinsAsDefaultText } from './src/lib/applyDefaultFont';
import { useAuth } from './src/hooks/useAuth';
import { AuthNavigator, MainNavigator } from './src/navigation/AppNavigator';
import { AppAlertModalHost } from './src/components/AppAlertModalHost';
import { BrandLogo } from './src/components/BrandLogo';

const AppContent: React.FC = () => {
  const { session, profile, loading, signIn, signUp, signOut, isAdmin } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <BrandLogo size={72} />
        <ActivityIndicator
          size="large"
          color={theme.brandPrimary}
          style={{ marginTop: 24 }}
        />
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
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      applyPoppinsAsDefaultText();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || !i18nReady) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <BrandLogo size={72} />
        <ActivityIndicator
          size="large"
          color={theme.brandPrimary}
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
        <AppAlertModalHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
