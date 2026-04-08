import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Profile } from '../types';
import { NotificationsProvider, useNotificationsContext } from '../context/NotificationsContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { EmployeeHomeScreen } from '../screens/employee/EmployeeHomeScreen';
import { NewExpenseScreen } from '../screens/employee/NewExpenseScreen';
import { ExpenseDetailScreen } from '../screens/employee/ExpenseDetailScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

interface AuthNavigatorProps {
  onLogin: (email: string, password: string) => Promise<{ error: any }>;
  onRegister: (
    email: string,
    password: string,
    fullName: string,
    role: any
  ) => Promise<{ error: any }>;
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onLogin, onRegister }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login">
      {(props: any) => <LoginScreen {...props} onLogin={onLogin} />}
    </Stack.Screen>
    <Stack.Screen name="Register">
      {(props: any) => <RegisterScreen {...props} onRegister={onRegister} />}
    </Stack.Screen>
  </Stack.Navigator>
);

interface EmployeeStackProps {
  profile: Profile;
}

const EmployeeStack: React.FC<EmployeeStackProps> = ({ profile }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EmployeeHome">
      {(props: any) => <EmployeeHomeScreen {...props} profile={profile} />}
    </Stack.Screen>
    <Stack.Screen name="NewExpense">
      {(props: any) => <NewExpenseScreen {...props} profile={profile} />}
    </Stack.Screen>
    <Stack.Screen name="ExpenseDetail">
      {(props: any) => <ExpenseDetailScreen {...props} />}
    </Stack.Screen>
  </Stack.Navigator>
);

interface AdminStackProps {
  profile: Profile;
}

const AdminStack: React.FC<AdminStackProps> = ({ profile }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminDashboard">
      {(props: any) => <AdminDashboardScreen {...props} profile={profile} />}
    </Stack.Screen>
    <Stack.Screen name="ExpenseDetail">
      {(props: any) => <ExpenseDetailScreen {...props} />}
    </Stack.Screen>
  </Stack.Navigator>
);

const NotificationsStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerTintColor: '#2563eb',
      headerTitleStyle: { fontWeight: '700' as const },
      headerStyle: { backgroundColor: '#ffffff' },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen name="NotificationsHome" component={NotificationsScreen} />
    <Stack.Screen name="ExpenseDetail" options={{ headerShown: false }}>
      {(props: any) => <ExpenseDetailScreen {...props} />}
    </Stack.Screen>
  </Stack.Navigator>
);

interface MainNavigatorProps {
  profile: Profile;
  isAdmin: boolean;
  onLogout: () => Promise<void>;
}

const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <View className={`items-center justify-center rounded-xl px-3 py-1 ${focused ? 'bg-primary-100' : ''}`}>
    <Text className="text-xl">{icon}</Text>
  </View>
);

const MainNavigatorInner: React.FC<MainNavigatorProps> = ({
  profile,
  isAdmin,
  onLogout,
}) => {
  const { t } = useTranslation();
  const { unreadCount } = useNotificationsContext();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 80,
          paddingTop: 8,
          paddingBottom: 20,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          backgroundColor: '#ffffff',
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="ExpensesTab"
        options={{
          tabBarLabel: t('employee.title'),
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      >
        {() => <EmployeeStack profile={profile} />}
      </Tab.Screen>

      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          options={{
            tabBarLabel: t('admin.title'),
            tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
          }}
        >
          {() => <AdminStack profile={profile} />}
        </Tab.Screen>
      )}

      <Tab.Screen
        name="NotificationsTab"
        options={{
          tabBarLabel: t('notifications.title'),
          tabBarIcon: ({ focused }) => <TabIcon icon="🔔" focused={focused} />,
          tabBarBadge:
            unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      >
        {() => <NotificationsStack />}
      </Tab.Screen>

      <Tab.Screen
        name="SettingsTab"
        options={{
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      >
        {() => <SettingsScreen profile={profile} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC<MainNavigatorProps> = props => (
  <NotificationsProvider userId={props.profile.id}>
    <MainNavigatorInner {...props} />
  </NotificationsProvider>
);
