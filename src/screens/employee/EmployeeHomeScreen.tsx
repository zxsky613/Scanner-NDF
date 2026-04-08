import React, { useState, useCallback } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Expense, Profile } from '../../types';
import { useExpenses } from '../../hooks/useExpenses';
import { formatDate, formatCurrency } from '../../utils/dateFormat';

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

export const EmployeeHomeScreen: React.FC<Props> = ({ navigation, profile }) => {
  const { t } = useTranslation();
  const { expenses, loading, fetchExpenses, deleteExpense } = useExpenses(profile.id);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const renderExpense = ({ item }: { item: Expense }) => (
    <View className="bg-white rounded-2xl mb-3 mx-4 shadow-sm border border-gray-100 overflow-hidden">
      <TouchableOpacity
        className="p-4 active:bg-gray-50"
        onPress={() => navigation.navigate('ExpenseDetail', { expense: item })}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">{categoryIcons[item.category] ?? '📄'}</Text>
            <View>
              <Text className="font-semibold text-gray-900 text-base">
                {item.supplier}
              </Text>
              <Text className="text-gray-500 text-sm">
                {formatDate(item.receipt_date)}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="font-bold text-gray-900 text-base">
              {formatCurrency(item.amount_ttc)}
            </Text>
            <View className={`px-2 py-0.5 rounded-full mt-1 ${statusColors[item.status]?.split(' ')[0]}`}>
              <Text className={`text-xs font-medium ${statusColors[item.status]?.split(' ')[1]}`}>
                {t(`expense.${item.status}`)}
              </Text>
            </View>
          </View>
        </View>
        {item.is_fiscal_alert && (
          <View className="bg-red-50 rounded-lg px-3 py-1.5 mt-2">
            <Text className="text-red-700 text-xs">⚠️ {t('alerts.fiscalTitle')}</Text>
          </View>
        )}
        {item.is_flagged_duplicate && (
          <View className="bg-yellow-50 rounded-lg px-3 py-1.5 mt-1">
            <Text className="text-yellow-700 text-xs">🔄 {t('alerts.duplicateTitle')}</Text>
          </View>
        )}
      </TouchableOpacity>
      {item.status === 'pending' && (
        <TouchableOpacity
          className="px-4 py-3 border-t border-gray-100 bg-red-50/50"
          onPress={() => openDeleteConfirm(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text className="text-red-600 text-sm font-medium text-center">{t('common.delete')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-primary-600 pt-14 pb-6 px-6 rounded-b-3xl">
        <Text className="text-white text-2xl font-bold">{t('employee.title')}</Text>
        <Text className="text-primary-200 mt-1">
          {profile.full_name}
        </Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderExpense}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
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
        className="absolute bottom-8 right-6 bg-primary-600 w-16 h-16 rounded-2xl items-center justify-center shadow-lg"
        onPress={() => navigation.navigate('NewExpense')}
      >
        <Text className="text-white text-3xl font-light">+</Text>
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
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl z-10">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              {t('expense.deleteModalTitle')}
            </Text>
            <Text className="text-gray-600 text-base mb-6">{t('expense.deleteConfirm')}</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border border-gray-300 rounded-xl py-3.5 items-center"
                onPress={closeDeleteConfirm}
                disabled={deleteLoading}
              >
                <Text className="text-gray-800 font-medium">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-600 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
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
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm z-10">
            <Text className="text-lg font-bold text-gray-900 mb-2">{t('common.error')}</Text>
            <Text className="text-gray-600 text-base mb-6">{errorMessage}</Text>
            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-3.5 items-center"
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
