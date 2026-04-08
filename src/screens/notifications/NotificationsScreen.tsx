import React, { useCallback, useLayoutEffect } from 'react';
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
import { Expense } from '../../types';
import { supabase } from '../../config/supabase';
import { formatDate } from '../../utils/dateFormat';
import { useNotificationsContext } from '../../context/NotificationsContext';
import { showAppAlert } from '../../utils/alert';

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

export const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { notifications, loading, refresh, markRead, markAllRead, unreadCount } =
    useNotificationsContext();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('notifications.title'),
      headerRight: () =>
        unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => void markAllRead()}
            className="mr-2 px-2 py-1"
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Text className="text-primary-600 text-sm font-semibold">{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, t, unreadCount, markAllRead]);

  const onPressNotification = async (id: string, expenseId: string | null) => {
    await markRead(id);
    if (!expenseId) return;
    const expense = await fetchExpenseForDetail(expenseId);
    if (!expense) {
      showAppAlert(t('notifications.expenseUnavailableTitle'), t('notifications.expenseUnavailableBody'));
      return;
    }
    navigation.navigate('ExpenseDetail', { expense });
  };

  if (loading && notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={loading && notifications.length > 0} onRefresh={() => void refresh()} />
        }
        contentContainerStyle={
          notifications.length === 0 ? { flexGrow: 1 } : { paddingBottom: 32 }
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 py-24">
            <Text className="text-4xl mb-3">🔔</Text>
            <Text className="text-gray-600 text-center text-base">{t('notifications.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const unread = !item.read_at;
          return (
            <TouchableOpacity
              className={`mx-4 mt-3 p-4 rounded-2xl border ${
                unread ? 'bg-white border-primary-200' : 'bg-white border-gray-200'
              }`}
              activeOpacity={0.85}
              onPress={() => void onPressNotification(item.id, item.expense_id)}
            >
              <View className="flex-row items-start gap-3">
                {unread ? <View className="w-2 h-2 rounded-full bg-primary-500 mt-2" /> : <View className="w-2 mt-2" />}
                <View className="flex-1 min-w-0">
                  <Text className={`text-base ${unread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                    {item.title}
                  </Text>
                  {item.body ? (
                    <Text className="text-gray-600 text-sm mt-1" numberOfLines={3}>
                      {item.body}
                    </Text>
                  ) : null}
                  <Text className="text-gray-400 text-xs mt-2">{formatDate(item.created_at)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};
