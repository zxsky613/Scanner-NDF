import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../config/theme';
import { Font } from '../config/fonts';
import { WEB_SIDEBAR_WIDTH } from '../config/webLayout';
import type { Profile } from '../types';
import { userRoleLabel } from '../utils/userRoleLabel';
import { AppNameText } from './AppNameText';

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ROUTE_ICONS: Partial<Record<string, TabIconName>> = {
  ExpensesTab: 'clipboard-text-outline',
  AdminTab: 'view-dashboard-outline',
  CrmTab: 'briefcase-outline',
  NotificationsTab: 'bell-outline',
  SettingsTab: 'cog-outline',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

type Props = BottomTabBarProps & {
  profile: Profile;
};

/**
 * Menu latéral web (maquette type « dashboard ») : logo, sections, profil.
 * Couleurs alignées sur `theme` (ardoise / primary).
 */
export function WebDesktopSidebar({ state, descriptors, navigation, profile }: Props) {
  const { t } = useTranslation();

  const mainRoutes = state.routes.filter(r => r.name !== 'SettingsTab');
  const settingsRoutes = state.routes.filter(r => r.name === 'SettingsTab');

  const renderItem = (route: (typeof state.routes)[0], routeIndex: number) => {
    const { options } = descriptors[route.key];
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : options.title ?? route.name;
    const isFocused = state.index === routeIndex;
    const iconName = ROUTE_ICONS[route.name] ?? 'circle-outline';
    const badge = options.tabBarBadge;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: isFocused }}
        style={({ pressed }) => [
          styles.navItem,
          isFocused ? styles.navItemActive : null,
          pressed ? styles.navItemPressed : null,
        ]}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={20}
          color={isFocused ? theme.brandInk : theme.inkMuted}
        />
        <Text
          style={[styles.navLabel, isFocused ? styles.navLabelActive : styles.navLabelInactive]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {typeof badge === 'number' || typeof badge === 'string' ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{String(badge)}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.root} accessibilityRole="none">
      <View style={styles.sidebarHeader}>
        <View style={styles.logoBox}>
          <Ionicons name="receipt-outline" size={20} color="#ffffff" />
        </View>
        <View className="flex-1 min-w-0">
          <AppNameText className="text-[18px] text-ink leading-tight" numberOfLines={1}>
            {t('common.appName')}
          </AppNameText>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>{t('employee.webNavMain')}</Text>
        {mainRoutes.map(route => {
          const idx = state.routes.findIndex(r => r.key === route.key);
          return renderItem(route, idx);
        })}

        {settingsRoutes.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
              {t('employee.webNavSettings')}
            </Text>
            {settingsRoutes.map(route => {
              const idx = state.routes.findIndex(r => r.key === route.key);
              return renderItem(route, idx);
            })}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(profile.full_name)}</Text>
        </View>
        <View style={styles.userMeta}>
          <Text style={styles.userName} numberOfLines={1}>
            {profile.full_name}
          </Text>
          <Text style={styles.userRole} numberOfLines={1}>
            {userRoleLabel(profile.role, t)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Ne pas utiliser flex: 1 ici : le tab bar est dans un flexDirection row,
   * sinon la sidebar absorbe l’espace horizontal (effet « barre à 40 % »).
   */
  root: {
    width: WEB_SIDEBAR_WIDTH,
    minWidth: WEB_SIDEBAR_WIDTH,
    maxWidth: WEB_SIDEBAR_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: 'rgba(36, 41, 73, 0.1)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '4px 0 24px rgba(36, 41, 73, 0.06)' } as ViewStyle)
      : {}),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.inkMuted,
    fontFamily: Font.semibold,
    fontWeight: '600',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sectionLabelSpaced: {
    marginTop: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: 'rgba(96, 159, 181, 0.16)',
  },
  navItemPressed: {
    opacity: 0.88,
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Font.medium,
    fontWeight: '500',
  },
  navLabelActive: {
    color: theme.brandInk,
  },
  navLabelInactive: {
    color: theme.brandInk,
    opacity: 0.82,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: theme.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: Font.bold,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(36, 41, 73, 0.1)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.heroHeaderBg,
    borderWidth: 1,
    borderColor: theme.heroHeaderBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: Font.semibold,
    fontWeight: '600',
    color: theme.brandInk,
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontFamily: Font.medium,
    fontWeight: '500',
    color: theme.brandInk,
  },
  userRole: {
    fontSize: 12,
    color: theme.inkMuted,
    marginTop: 2,
  },
});
