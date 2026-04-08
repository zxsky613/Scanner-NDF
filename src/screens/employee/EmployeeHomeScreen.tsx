import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Expense, Profile } from '../../types';
import { useExpenses } from '../../hooks/useExpenses';
import { formatDate, formatCurrency } from '../../utils/dateFormat';
import { theme, headerPaddingTop } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  profile: Profile;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const categoryIcons: Record<string, string> = {
  food: '🍽️',
  materials: '🔧',
  travel: '🚗',
  other: '📋',
};

const SWIPE_ACTION_W = 56;
const SWIPE_ICON_SIZE = 24;

/** Actions swipe : fond blanc, icônes outline (pas de blocs colorés type iOS). */
const swipeStyles = {
  cell: {
    width: SWIPE_ACTION_W,
    backgroundColor: '#ffffff',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  iconView: '#6474A6' as const,
  iconEdit: '#B45309' as const,
  iconDelete: '#C94A54' as const,
};

export const EmployeeHomeScreen: React.FC<Props> = ({ navigation, profile }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { expenses, loading, fetchExpenses, deleteExpense } = useExpenses(profile.id);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [fetchExpenses])
  );

  const openDeleteConfirm = (id: string) => {
    setDeleteTargetId(id);
  };

  const closeDeleteConfirm = () => {
    if (!deleteLoading) setDeleteTargetId(null);
  };

  const confirmDelete = async () => {
    const id = deleteTargetId;
    if (!id || deleteLoading) return;
    setDeleteLoading(true);
    try {
      const { error } = await deleteExpense(id);
      setDeleteTargetId(null);
      if (error) {
        setErrorMessage(error.message ?? t('expense.deleteFailed'));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  const closeSwipe = (id: string) => {
    swipeRefs.current.get(id)?.close();
  };

  const registerSwipeRef = (id: string) => (ref: Swipeable | null) => {
    if (ref) swipeRefs.current.set(id, ref);
    else swipeRefs.current.delete(id);
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const pending = item.status === 'pending';

    const rightActions = (
      <View
        className="flex-row rounded-r-[22px] border border-gray-100 bg-white overflow-hidden"
        style={{ alignSelf: 'stretch' }}
      >
        <Pressable
          style={swipeStyles.cell}
          android_ripple={{ color: '#f1f5f9' }}
          onPress={() => {
            closeSwipe(item.id);
            navigation.navigate('ExpenseDetail', { expense: item });
          }}
          accessibilityRole="button"
          accessibilityLabel={t('employee.swipeView')}
        >
          <Ionicons name="eye-outline" size={SWIPE_ICON_SIZE} color={swipeStyles.iconView} />
        </Pressable>
        {pending && (
          <>
            <View className="w-px bg-gray-100 self-stretch" />
            <Pressable
              style={swipeStyles.cell}
              android_ripple={{ color: '#f1f5f9' }}
              onPress={() => {
                closeSwipe(item.id);
                navigation.navigate('NewExpense', { editExpense: item });
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.edit')}
            >
              <Ionicons name="create-outline" size={SWIPE_ICON_SIZE} color={swipeStyles.iconEdit} />
            </Pressable>
            <View className="w-px bg-gray-100 self-stretch" />
            <Pressable
              style={swipeStyles.cell}
              android_ripple={{ color: '#fef2f2' }}
              onPress={() => {
                closeSwipe(item.id);
                openDeleteConfirm(item.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <Ionicons name="trash-outline" size={SWIPE_ICON_SIZE} color={swipeStyles.iconDelete} />
            </Pressable>
          </>
        )}
      </View>
    );

    return (
      <View className="mb-3 mx-5">
        <Swipeable
          ref={registerSwipeRef(item.id)}
          friction={2}
          overshootRight={false}
          renderRightActions={() => rightActions}
        >
          <View className="bg-white rounded-[22px] shadow-sm border border-gray-100/80 overflow-hidden">
            <TouchableOpacity
              className="p-5 active:bg-gray-50/80"
              onPress={() => navigation.navigate('ExpenseDetail', { expense: item })}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1 min-w-0">
                  <View className="w-14 h-14 rounded-2xl bg-surface items-center justify-center border border-gray-100">
                    <Text className="text-2xl">{categoryIcons[item.category] ?? '📄'}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>
                      {t(`expense.${item.category}`)}
                    </Text>
                    <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={2}>
                      {formatDate(item.receipt_date)} · {item.supplier}
                    </Text>
                  </View>
                </View>
                <View className="items-end pl-2">
                  <Text className="font-bold text-gray-900 text-base">
                    {formatCurrency(item.amount_ttc)}
                  </Text>
                  <View className={`px-2.5 py-1 rounded-full mt-1.5 ${statusColors[item.status]?.split(' ')[0]}`}>
                    <Text className={`text-[11px] font-bold ${statusColors[item.status]?.split(' ')[1]}`}>
                      {t(`expense.${item.status}`)}
                    </Text>
                  </View>
                </View>
              </View>
              {item.is_fiscal_alert && (
                <View className="bg-red-50 rounded-xl px-3 py-2 mt-3">
                  <Text className="text-red-700 text-xs font-medium">⚠️ {t('alerts.fiscalTitle')}</Text>
                </View>
              )}
              {item.is_flagged_duplicate && (
                <View className="bg-amber-50 rounded-xl px-3 py-2 mt-2">
                  <Text className="text-amber-800 text-xs font-medium">🔄 {t('alerts.duplicateTitle')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Swipeable>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-surface">
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
          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
            {t('common.appName')}
          </Text>
          <Text className="text-gray-900 text-3xl font-bold mt-2 leading-tight">
            {t('employee.title')}
          </Text>
          <Text className="text-gray-400 text-base mt-2">{profile.full_name}</Text>
          <View className="flex-row gap-3 mt-5">
            <View className="flex-1 bg-surface rounded-2xl px-4 py-3.5 border border-gray-100">
              <Text className="text-gray-400 text-xs font-medium">{t('admin.totalExpenses')}</Text>
              <Text className="text-gray-900 text-2xl font-bold mt-0.5">{expenses.length}</Text>
            </View>
            <View className="flex-1 bg-primary-50 rounded-2xl px-4 py-3.5 border border-primary-100">
              <Text className="text-primary-600 text-xs font-semibold">{t('expense.pending')}</Text>
              <Text className="text-primary-600 text-2xl font-bold mt-0.5">{pendingCount}</Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderExpense}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchExpenses} />
        }
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-6xl mb-4">📋</Text>
            <Text className="text-gray-500 text-lg font-medium">
              {t('employee.noExpenses')}
            </Text>
            <Text className="text-gray-400 mt-1">
              {t('employee.noExpensesDesc')}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute bottom-10 right-6 bg-primary-600 w-16 h-16 rounded-full items-center justify-center"
        onPress={() => navigation.navigate('NewExpense')}
        style={{
          shadowColor: theme.brandPrimary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <Text className="text-white text-3xl font-light leading-none">+</Text>
      </TouchableOpacity>

      <Modal
        visible={!!deleteTargetId}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteConfirm}
      >
        <View className="flex-1 justify-center items-center px-6">
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={closeDeleteConfirm}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <View className="bg-white rounded-[28px] p-6 w-full max-w-sm border border-gray-100 shadow-xl z-10">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              {t('expense.deleteModalTitle')}
            </Text>
            <Text className="text-gray-600 text-base mb-6">{t('expense.deleteConfirm')}</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border border-gray-200 rounded-full py-3.5 items-center bg-surface"
                onPress={closeDeleteConfirm}
                disabled={deleteLoading}
              >
                <Text className="text-gray-800 font-semibold">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-full py-3.5 items-center flex-row justify-center gap-2"
                onPress={() => void confirmDelete()}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold">{t('common.delete')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!errorMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorMessage(null)}
      >
        <View className="flex-1 justify-center items-center px-6">
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => setErrorMessage(null)}
          />
          <View className="bg-white rounded-[28px] p-6 w-full max-w-sm z-10 border border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-2">{t('common.error')}</Text>
            <Text className="text-gray-600 text-base mb-6">{errorMessage}</Text>
            <TouchableOpacity
              className="bg-primary-600 rounded-full py-3.5 items-center"
              onPress={() => setErrorMessage(null)}
            >
              <Text className="text-white font-semibold">{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
