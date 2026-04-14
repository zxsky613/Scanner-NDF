import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Expense, NotificationType, AppNotification } from '../../types';
import { supabase } from '../../config/supabase';
import { formatDate } from '../../utils/dateFormat';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { showAppAlert, showAppConfirm } from '../../utils/alert';
import { getLocalizedNotification } from '../../utils/notificationDisplay';
import { notificationNeedsAttention } from '../../utils/notificationAttention';
import { theme, headerPaddingTop, heroHeaderShadow } from '../../config/theme';
import { AppNameText } from '../../components/AppNameText';
import { ScreenHeroTitle } from '../../components/ScreenHeroTitle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IS_WEB,
  WEB_CARD_GUTTER_CLASS,
  WEB_HERO_CARD_CLASS,
  WEB_PAGE_GUTTER_CLASS,
  webHeroCardInlineStyle,
  webHeaderOuterInlineStyle,
} from '../../config/webLayout';

type NotificationsStackParamList = {
  NotificationsHome: undefined;
  ExpenseDetail: { expense: Expense };
};

interface Props {
  navigation: NativeStackNavigationProp<NotificationsStackParamList, 'NotificationsHome'>;
}

async function fetchExpenseForDetail(expenseId: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Expense & { city?: string | null };
  const { data: prof } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', row.user_id)
    .maybeSingle();
  return {
    ...row,
    city: typeof row.city === 'string' ? row.city : '',
    profiles: prof ? (prof as Expense['profiles']) : undefined,
  };
}

const notificationVisual: Record<
  NotificationType,
  { icon: string; iconBg: string }
> = {
  expense_created: { icon: '📋', iconBg: 'bg-surface' },
  expense_updated: { icon: '✏️', iconBg: 'bg-amber-50' },
  expense_deleted: { icon: '🗑️', iconBg: 'bg-gray-100' },
  expense_reviewed: { icon: '📬', iconBg: 'bg-primary-50' },
};

type ListRow =
  | { kind: 'header'; section: 'unread' | 'read'; count: number }
  | { kind: 'notif'; item: AppNotification };

function sortByNewest(a: AppNotification, b: AppNotification): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const pageX = IS_WEB ? WEB_PAGE_GUTTER_CLASS : 'px-5';
  const cardX = IS_WEB ? WEB_CARD_GUTTER_CLASS : 'mx-5';
  const {
    notifications,
    loading,
    refreshing,
    refresh,
    syncInBackground,
    markRead,
    markAllRead,
    deleteNotification,
    unreadCount,
  } = useNotificationsContext();
  const [treatedExpanded, setTreatedExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void syncInBackground();
    }, [syncInBackground])
  );

  const listRows = useMemo((): ListRow[] => {
    const untreated = notifications.filter(n => notificationNeedsAttention(n)).sort(sortByNewest);
    const treated = notifications.filter(n => !notificationNeedsAttention(n)).sort(sortByNewest);
    const rows: ListRow[] = [];
    rows.push({ kind: 'header', section: 'unread', count: untreated.length });
    untreated.forEach(item => rows.push({ kind: 'notif', item }));
    if (treated.length > 0) {
      rows.push({ kind: 'header', section: 'read', count: treated.length });
      if (treatedExpanded) {
        treated.forEach(item => rows.push({ kind: 'notif', item }));
      }
    }
    return rows;
  }, [notifications, treatedExpanded]);

  const onDeletePress = async (n: AppNotification) => {
    const ok = await showAppConfirm(
      t('notifications.deleteTitle'),
      t('notifications.deleteMessage'),
      t('common.cancel'),
      t('common.delete'),
      { destructive: true }
    );
    if (!ok) return;
    await deleteNotification(n.id);
  };

  const onPressNotification = async (id: string, expenseId: string | null) => {
    await markRead(id);
    if (!expenseId) return;
    const expense = await fetchExpenseForDetail(expenseId);
    if (!expense) {
      showAppAlert(
        t('notifications.expenseUnavailableTitle'),
        t('notifications.expenseUnavailableBody'),
        'error'
      );
      return;
    }
    navigation.navigate('ExpenseDetail', { expense });
  };

  const header = (
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
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0">
            <AppNameText
              className={
                IS_WEB
                  ? 'text-ink-300 text-[10px] uppercase tracking-[0.16em]'
                  : 'text-ink-300 text-xs uppercase tracking-[0.14em]'
              }
            >
              {t('common.appName')}
            </AppNameText>
            <ScreenHeroTitle className={IS_WEB ? 'mt-1' : 'mt-2'}>{t('notifications.title')}</ScreenHeroTitle>
            <Text className={IS_WEB ? 'text-gray-500 mt-1 text-sm leading-5' : 'text-gray-400 mt-2 text-base'}>
              {unreadCount > 0
                ? t('notifications.unreadLine', { count: unreadCount })
                : t('notifications.allCaughtUp')}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => void markAllRead()}
              className={
                IS_WEB
                  ? 'bg-primary-600 rounded-lg px-3 py-2 active:opacity-90'
                  : 'bg-primary-600 rounded-full px-4 py-2.5 active:opacity-90'
              }
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text className="text-white text-[11px] font-bold text-center">
                {t('notifications.markAllRead')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );

  const emptyCard = (
    <View className={`${cardX} mt-6 bg-white rounded-[28px] border border-gray-100 shadow-sm px-6 py-12 items-center`}>
      <View className="w-20 h-20 rounded-full bg-primary-50 items-center justify-center mb-4">
        <Text className="text-4xl">🔔</Text>
      </View>
      <Text className="text-gray-900 font-bold text-lg text-center">{t('notifications.empty')}</Text>
      <Text className="text-gray-400 text-sm text-center mt-2 leading-5">{t('notifications.emptyHint')}</Text>
    </View>
  );

  const renderRow = ({ item }: { item: ListRow }) => {
    if (item.kind === 'header') {
      const isRead = item.section === 'read';
      if (isRead) {
        return (
          <TouchableOpacity
            className={`${cardX} mt-4 mb-1 flex-row items-center justify-between py-3 px-1 active:opacity-80`}
            onPress={() => setTreatedExpanded(v => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              treatedExpanded ? t('notifications.collapseTreated') : t('notifications.expandTreated')
            }
          >
            <Text className="text-ink font-bold text-base">
              {t('notifications.sectionTreated')} ({item.count})
            </Text>
            <Ionicons
              name={treatedExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={theme.brandInk}
            />
          </TouchableOpacity>
        );
      }
      return (
        <View className={`${cardX} mt-2 mb-1 pt-2`}>
          <Text className="text-ink font-bold text-base">
            {t('notifications.sectionUnread')} ({item.count})
          </Text>
        </View>
      );
    }

    const n = item.item;
    const needsAttention = notificationNeedsAttention(n);
    const vis = notificationVisual[n.type] ?? { icon: '🔔', iconBg: 'bg-gray-100' };
    const { title: dispTitle, body: dispBody } = getLocalizedNotification(n, t);
    return (
      <View
        className={`${cardX} mb-3 rounded-[22px] bg-white border shadow-sm overflow-hidden flex-row items-center ${
          needsAttention ? 'border-primary-200' : 'border-gray-100/90'
        }`}
      >
        <TouchableOpacity
          className="flex-1 flex-row items-center p-4 min-w-0"
          activeOpacity={0.88}
          onPress={() => void onPressNotification(n.id, n.expense_id)}
        >
          <View
            className={`w-14 h-14 rounded-2xl items-center justify-center border border-gray-100 ${vis.iconBg}`}
          >
            <Text className="text-2xl">{vis.icon}</Text>
          </View>
          <View className="flex-1 min-w-0 ml-3">
            <View className="flex-row items-center gap-2">
              <Text
                className={`text-base flex-1 ${needsAttention ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}
                numberOfLines={1}
              >
                {dispTitle}
              </Text>
              {needsAttention ? <View className="w-2 h-2 rounded-full bg-primary-600" /> : null}
            </View>
            {dispBody ? (
              <Text className="text-gray-400 text-sm mt-0.5 leading-5" numberOfLines={2}>
                {dispBody}
              </Text>
            ) : null}
            <Text className="text-gray-300 text-[11px] font-medium mt-1">
              {formatDate(n.created_at)}
              {n.expense_id ? ` · ${t('notifications.tapToOpen')}` : ''}
            </Text>
          </View>
          <Text className="text-primary-600 text-lg font-medium pl-1">›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="pr-4 py-4 pl-1"
          onPress={() => void onDeletePress(n)}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.delete')}
        >
          <Ionicons name="trash-outline" size={22} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    );
  };

  if (notifications.length === 0 && !loading) {
    return (
      <View className="flex-1 bg-surface">
        {header}
        <View className="flex-1">{emptyCard}</View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      {header}
      {loading && notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator size="large" color={theme.brandPrimary} />
          <Text className="text-gray-400 mt-4">{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={listRows}
          extraData={{
            i18n: i18n.language,
            treatedExpanded,
          }}
          keyExtractor={(row, index) =>
            row.kind === 'header' ? `h-${row.section}` : `n-${row.item.id}-${index}`
          }
          renderItem={renderRow}
          ListHeaderComponent={<View className="h-2" />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={theme.brandPrimary}
            />
          }
          contentContainerStyle={{ paddingBottom: 110 }}
        />
      )}
    </View>
  );
};
