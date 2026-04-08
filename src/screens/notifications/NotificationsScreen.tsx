import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Expense, NotificationType } from '../../types';
import { supabase } from '../../config/supabase';
import { formatDate } from '../../utils/dateFormat';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { showAppAlert } from '../../utils/alert';
import { theme, headerPaddingTop } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const row = data as Expense;
  const { data: prof } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', row.user_id)
    .maybeSingle();
  return {
    ...row,
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

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { notifications, loading, refresh, markRead, markAllRead, unreadCount } =
    useNotificationsContext();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

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
    <View className="px-5 pb-2" style={{ paddingTop: headerPaddingTop(insets.top) }}>
      <View
        className="bg-white rounded-[28px] px-6 py-6 border border-gray-100/80 shadow-sm"
        style={{
          shadowColor: theme.brandPrimary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.06,
          shadowRadius: 20,
          elevation: 4,
        }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0">
            <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              {t('common.appName')}
            </Text>
            <Text className="text-gray-900 text-3xl font-bold mt-2 leading-tight">{t('notifications.title')}</Text>
            <Text className="text-gray-400 mt-2 text-base">
              {unreadCount > 0
                ? t('notifications.unreadLine', { count: unreadCount })
                : t('notifications.allCaughtUp')}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity
              onPress={() => void markAllRead()}
              className="bg-primary-600 rounded-full px-4 py-2.5 active:opacity-90"
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
    <View className="mx-5 mt-6 bg-white rounded-[28px] border border-gray-100 shadow-sm px-6 py-12 items-center">
      <View className="w-20 h-20 rounded-full bg-primary-50 items-center justify-center mb-4">
        <Text className="text-4xl">🔔</Text>
      </View>
      <Text className="text-gray-900 font-bold text-lg text-center">{t('notifications.empty')}</Text>
      <Text className="text-gray-400 text-sm text-center mt-2 leading-5">{t('notifications.emptyHint')}</Text>
    </View>
  );

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
          data={notifications}
          keyExtractor={item => item.id}
          ListHeaderComponent={notifications.length > 0 ? <View className="h-3" /> : null}
          refreshControl={
            <RefreshControl
              refreshing={loading && notifications.length > 0}
              onRefresh={() => void refresh()}
              tintColor={theme.brandPrimary}
            />
          }
          contentContainerStyle={
            notifications.length === 0
              ? { flexGrow: 1, paddingBottom: 110 }
              : { paddingBottom: 110 }
          }
          ListEmptyComponent={emptyCard}
          renderItem={({ item }) => {
            const unread = !item.read_at;
            const vis = notificationVisual[item.type] ?? { icon: '🔔', iconBg: 'bg-gray-100' };
            return (
              <TouchableOpacity
                className={`mx-5 mb-3 p-4 rounded-[22px] bg-white border shadow-sm overflow-hidden flex-row items-center ${
                  unread ? 'border-primary-200' : 'border-gray-100/90'
                }`}
                activeOpacity={0.88}
                onPress={() => void onPressNotification(item.id, item.expense_id)}
              >
                <View
                  className={`w-14 h-14 rounded-2xl items-center justify-center border border-gray-100 ${vis.iconBg}`}
                >
                  <Text className="text-2xl">{vis.icon}</Text>
                </View>
                <View className="flex-1 min-w-0 ml-3">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className={`text-base flex-1 ${unread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {unread ? (
                      <View className="w-2 h-2 rounded-full bg-primary-600" />
                    ) : null}
                  </View>
                  {item.body ? (
                    <Text className="text-gray-400 text-sm mt-0.5 leading-5" numberOfLines={2}>
                      {item.body}
                    </Text>
                  ) : null}
                  <Text className="text-gray-300 text-[11px] font-medium mt-1">
                    {formatDate(item.created_at)}
                    {item.expense_id ? ` · ${t('notifications.tapToOpen')}` : ''}
                  </Text>
                </View>
                <Text className="text-primary-600 text-lg font-medium pl-1">›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};
