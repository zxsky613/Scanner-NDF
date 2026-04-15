import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Platform, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Font } from '../config/fonts';
import { theme } from '../config/theme';
import { Profile, UserRole } from '../types';
import { NotificationsProvider, useNotificationsContext } from '../context/NotificationsContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { EmployeeHomeScreen } from '../screens/employee/EmployeeHomeScreen';
import { NewExpenseScreen } from '../screens/employee/NewExpenseScreen';
import { ExpenseDetailScreen } from '../screens/employee/ExpenseDetailScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { CrmProjectsScreen } from '../screens/crm/CrmProjectsScreen';
import { FinanceProjectsScreen } from '../screens/finance/FinanceProjectsScreen';
import { IS_WEB, webLeftTabBarStyle } from '../config/webLayout';
import { WebDesktopSidebar } from '../components/WebDesktopSidebar';
import { hasExpenseManagementAccess } from '../lib/roles';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

interface AuthNavigatorProps {
  onLogin: (email: string, password: string) => Promise<{ error: any }>;
  onRegister: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
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
      {(props: any) => <ExpenseDetailScreen {...props} viewerProfile={profile} />}
    </Stack.Screen>
  </Stack.Navigator>
);

interface NotificationsStackProps {
  profile: Profile;
}

const NotificationsStack: React.FC<NotificationsStackProps> = ({ profile }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="NotificationsHome" component={NotificationsScreen} />
    <Stack.Screen name="ExpenseDetail">
      {(props: any) => <ExpenseDetailScreen {...props} viewerProfile={profile} />}
    </Stack.Screen>
  </Stack.Navigator>
);

interface CrmStackProps {
  profile: Profile;
}

const CrmStack: React.FC<CrmStackProps> = ({ profile }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CrmHome">
      {(props: any) => <CrmProjectsScreen {...props} profile={profile} />}
    </Stack.Screen>
  </Stack.Navigator>
);

interface FinanceStackProps {
  profile: Profile;
}

const FinanceStack: React.FC<FinanceStackProps> = ({ profile }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FinanceHome">
      {(props: any) => <FinanceProjectsScreen {...props} profile={profile} />}
    </Stack.Screen>
  </Stack.Navigator>
);

interface MainNavigatorProps {
  profile: Profile;
  isAdmin: boolean;
  isCrmAccess: boolean;
  isFinanceTabAccess: boolean;
  onLogout: () => Promise<void>;
}

const TAB_ICON_SZ = Platform.OS === 'android' ? 28 : 26;

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TabIcon = ({ name, focused }: { name: TabIconName; focused: boolean }) => {
  return (
    <View
      className={`items-center justify-center rounded-full min-w-[44px] min-h-[40px] ${
        focused ? 'bg-primary-50' : ''
      }`}
    >
      <MaterialCommunityIcons
        name={name}
        size={TAB_ICON_SZ}
        color={focused ? theme.brandInk : theme.inkMuted}
      />
    </View>
  );
};

const MainNavigatorInner: React.FC<MainNavigatorProps> = ({
  profile,
  isAdmin,
  isCrmAccess,
  isFinanceTabAccess,
  onLogout,
}) => {
  const { t } = useTranslation();
  const { unreadCount, pendingExpenseCount } = useNotificationsContext();

  const mobileTabBarStyle: ViewStyle = {
    height: Platform.OS === 'ios' ? 92 : 80,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    paddingHorizontal: 4,
    borderTopWidth: 0,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: theme.brandInk,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
        }
      : { elevation: 20 }),
  };

  return (
    <Tab.Navigator
      tabBar={props =>
        IS_WEB ? (
          <WebDesktopSidebar {...props} profile={profile} />
        ) : (
          <BottomTabBar {...props} />
        )
      }
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarPosition: IS_WEB ? 'left' : 'bottom',
        tabBarVariant: IS_WEB ? 'material' : 'uikit',
        tabBarStyle: IS_WEB ? webLeftTabBarStyle() : mobileTabBarStyle,
        tabBarBackground: undefined,
        sceneStyle: IS_WEB ? { backgroundColor: theme.surface, flex: 1 } : undefined,
        tabBarActiveTintColor: theme.brandInk,
        tabBarInactiveTintColor: theme.inkMuted,
        tabBarItemStyle: IS_WEB
          ? {
              paddingVertical: 6,
              minHeight: 48,
              borderRadius: 12,
            }
          : {
              paddingVertical: 4,
              minWidth: 56,
            },
        tabBarLabelStyle: {
          fontFamily: Font.semibold,
          fontSize: IS_WEB ? 13 : 11,
          fontWeight: '600',
          letterSpacing: 0.12,
          marginTop: IS_WEB ? 0 : 2,
        },
      }}
    >
      <Tab.Screen
        name="ExpensesTab"
        options={{
          tabBarLabel: t('navTabs.expenses'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="clipboard-text-outline" focused={focused} />
          ),
        }}
      >
        {() => <EmployeeStack profile={profile} />}
      </Tab.Screen>

      {isCrmAccess && (
        <Tab.Screen
          name="CrmTab"
          options={{
            tabBarLabel: t('navTabs.crm'),
            tabBarIcon: ({ focused }) => (
              <TabIcon name="briefcase-outline" focused={focused} />
            ),
          }}
        >
          {() => <CrmStack profile={profile} />}
        </Tab.Screen>
      )}

      {isFinanceTabAccess && (
        <Tab.Screen
          name="FinanceTab"
          options={{
            tabBarLabel: t('navTabs.finance'),
            tabBarIcon: ({ focused }) => (
              <TabIcon name="chart-line" focused={focused} />
            ),
          }}
        >
          {() => <FinanceStack profile={profile} />}
        </Tab.Screen>
      )}

      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          options={{
            tabBarLabel: t('navTabs.admin'),
            tabBarIcon: ({ focused }) => (
              <TabIcon name="view-dashboard-outline" focused={focused} />
            ),
            tabBarBadge:
              pendingExpenseCount > 0
                ? pendingExpenseCount > 99
                  ? '99+'
                  : pendingExpenseCount
                : undefined,
          }}
        >
          {() => <AdminStack profile={profile} />}
        </Tab.Screen>
      )}

      <Tab.Screen
        name="NotificationsTab"
        options={{
          tabBarLabel: t('navTabs.notifications'),
          tabBarIcon: ({ focused }) => <TabIcon name="bell-outline" focused={focused} />,
          tabBarBadge:
            unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        }}
      >
        {() => <NotificationsStack profile={profile} />}
      </Tab.Screen>

      <Tab.Screen
        name="SettingsTab"
        options={{
          tabBarLabel: t('navTabs.settings'),
          tabBarIcon: ({ focused }) => <TabIcon name="cog-outline" focused={focused} />,
        }}
      >
        {() => <SettingsScreen profile={profile} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC<MainNavigatorProps> = props => (
  <NotificationsProvider
    userId={props.profile.id}
    viewerIsReviewer={hasExpenseManagementAccess(props.profile.role)}
  >
    <MainNavigatorInner {...props} />
  </NotificationsProvider>
);
