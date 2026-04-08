import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Expense,
  Profile,
  ExpenseStatus,
  ExpenseCategory,
  ExpenseFilters,
} from '../../types';
import { useExpenses } from '../../hooks/useExpenses';
import { formatDate, formatCurrency } from '../../utils/dateFormat';
import { exportToExcel } from '../../utils/excelExport';
import { supabase } from '../../config/supabase';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  profile: Profile;
}

const statusOptions: (ExpenseStatus | 'all')[] = ['all', 'pending', 'approved', 'rejected'];
const categoryOptions: (ExpenseCategory | 'all')[] = [
  'all',
  'food',
  'materials',
  'travel',
  'other',
];

export const AdminDashboardScreen: React.FC<Props> = ({ navigation, profile }) => {
  const { t } = useTranslation();
  const { expenses, loading, fetchExpenses, updateExpenseStatus } = useExpenses(
    profile.id,
    true
  );

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ExpenseStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setEmployees(data);
    };
    loadEmployees();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchExpenses(filters);
    }, [fetchExpenses, filters])
  );

  const applyFilters = () => {
    const newFilters: ExpenseFilters = {};
    if (selectedStatus !== 'all') newFilters.status = selectedStatus;
    if (selectedCategory !== 'all') newFilters.category = selectedCategory;
    if (selectedEmployee) newFilters.employee_id = selectedEmployee;
    if (dateFrom) newFilters.date_from = dateFrom;
    if (dateTo) newFilters.date_to = dateTo;
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedEmployee(undefined);
    setDateFrom('');
    setDateTo('');
    setFilters({});
    setShowFilterModal(false);
  };

  const handleApprove = async (expenseId: string) => {
    const { error } = await updateExpenseStatus(expenseId, 'approved', profile.id);
    if (error) Alert.alert(t('common.error'), error.message);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const { error } = await updateExpenseStatus(
      rejectModal,
      'rejected',
      profile.id,
      rejectionReason
    );
    if (error) Alert.alert(t('common.error'), error.message);
    setRejectModal(null);
    setRejectionReason('');
  };

  const handleExport = async () => {
    if (expenses.length === 0) {
      Alert.alert(t('common.error'), t('common.noData'));
      return;
    }
    setExporting(true);
    try {
      await exportToExcel(expenses);
    } catch {
      Alert.alert(t('common.error'), t('admin.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const totals = {
    count: expenses.length,
    ht: expenses.reduce((sum, e) => sum + e.amount_ht, 0),
    ttc: expenses.reduce((sum, e) => sum + e.amount_ttc, 0),
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
  };

  const openExpenseDetail = (expense: Expense) => {
    navigation.navigate('ExpenseDetail', { expense });
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <View className="bg-white rounded-2xl p-4 mb-3 mx-4 border border-gray-100 shadow-sm">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openExpenseDetail(item)}
        accessibilityRole="button"
        accessibilityLabel={t('admin.viewDetails')}
      >
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 pr-2">
            <Text className="font-semibold text-gray-900 text-base">{item.supplier}</Text>
            <Text className="text-gray-500 text-sm mt-0.5">
              {(item.profiles as Profile | undefined)?.full_name ?? '—'}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              {formatDate(item.receipt_date)} · {t(`expense.${item.category}`)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-bold text-gray-900">{formatCurrency(item.amount_ttc)}</Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              HT: {formatCurrency(item.amount_ht)}
            </Text>
            <Text className="text-primary-600 text-xs font-medium mt-1">
              {t('admin.viewDetails')} ›
            </Text>
          </View>
        </View>

        {item.is_fiscal_alert && (
          <View className="bg-red-50 rounded-lg px-3 py-1.5 mb-2">
            <Text className="text-red-700 text-xs">⚠️ {t('alerts.fiscalTitle')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {item.status === 'pending' && (
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className="flex-1 bg-green-500 rounded-xl py-2.5 items-center"
            onPress={() => handleApprove(item.id)}
          >
            <Text className="text-white font-semibold text-sm">✓ {t('admin.approve')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-500 rounded-xl py-2.5 items-center"
            onPress={() => setRejectModal(item.id)}
          >
            <Text className="text-white font-semibold text-sm">✕ {t('admin.reject')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status !== 'pending' && (
        <View
          className={`self-start px-3 py-1 rounded-full mt-2 ${
            item.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              item.status === 'approved' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {t(`expense.${item.status}`)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-800 pt-14 pb-6 px-6 rounded-b-3xl">
        <Text className="text-white text-2xl font-bold">{t('admin.title')}</Text>
        <Text className="text-primary-300 mt-1">{profile.full_name} · {profile.role}</Text>

        {/* Stats */}
        <View className="flex-row gap-3 mt-5">
          <View className="flex-1 bg-white/10 rounded-xl p-3">
            <Text className="text-primary-200 text-xs">{t('admin.totalExpenses')}</Text>
            <Text className="text-white font-bold text-lg">{totals.count}</Text>
          </View>
          <View className="flex-1 bg-white/10 rounded-xl p-3">
            <Text className="text-primary-200 text-xs">{t('admin.totalTTC')}</Text>
            <Text className="text-white font-bold text-lg">{formatCurrency(totals.ttc)}</Text>
          </View>
          <View className="flex-1 bg-white/10 rounded-xl p-3">
            <Text className="text-primary-200 text-xs">{t('admin.pendingCount')}</Text>
            <Text className="text-yellow-300 font-bold text-lg">{totals.pending}</Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View className="flex-row gap-3 px-4 mt-4">
        <TouchableOpacity
          className="flex-1 bg-white border border-gray-200 rounded-xl py-3 items-center flex-row justify-center gap-2"
          onPress={() => setShowFilterModal(true)}
        >
          <Text className="text-base">🔍</Text>
          <Text className="text-gray-700 font-medium">{t('common.filter')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-green-600 rounded-xl py-3 items-center flex-row justify-center gap-2"
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text className="text-base">📊</Text>
              <Text className="text-white font-medium">{t('admin.exportExcel')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Expense list */}
      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderExpense}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchExpenses(filters)}
          />
        }
        ListEmptyComponent={
          <View className="items-center mt-20">
            <Text className="text-6xl mb-4">📋</Text>
            <Text className="text-gray-500 text-lg">{t('common.noData')}</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-xl font-bold text-gray-900 mb-6">
              {t('common.filter')}
            </Text>

            {/* Status filter */}
            <Text className="text-gray-700 font-medium mb-2">{t('admin.filterByStatus')}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {statusOptions.map(s => (
                <TouchableOpacity
                  key={s}
                  className={`px-4 py-2 rounded-full border ${
                    selectedStatus === s
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedStatus === s ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {s === 'all' ? t('common.all') : t(`expense.${s}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category filter */}
            <Text className="text-gray-700 font-medium mb-2">{t('admin.filterByCategory')}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {categoryOptions.map(c => (
                <TouchableOpacity
                  key={c}
                  className={`px-4 py-2 rounded-full border ${
                    selectedCategory === c
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onPress={() => setSelectedCategory(c)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedCategory === c ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {c === 'all' ? t('common.all') : t(`expense.${c}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Employee filter */}
            <Text className="text-gray-700 font-medium mb-2">{t('admin.filterByEmployee')}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              <TouchableOpacity
                className={`px-4 py-2 rounded-full border ${
                  !selectedEmployee
                    ? 'bg-primary-600 border-primary-600'
                    : 'bg-gray-50 border-gray-200'
                }`}
                onPress={() => setSelectedEmployee(undefined)}
              >
                <Text
                  className={`text-sm font-medium ${
                    !selectedEmployee ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {t('common.all')}
                </Text>
              </TouchableOpacity>
              {employees.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  className={`px-4 py-2 rounded-full border ${
                    selectedEmployee === emp.id
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onPress={() => setSelectedEmployee(emp.id)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedEmployee === emp.id ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {emp.full_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date filters */}
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-1.5">{t('admin.dateFrom')}</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-1.5">{t('admin.dateTo')}</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm"
                  value={dateTo}
                  onChangeText={setDateTo}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border border-gray-300 rounded-xl py-3.5 items-center"
                onPress={resetFilters}
              >
                <Text className="text-gray-700 font-medium">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary-600 rounded-xl py-3.5 items-center"
                onPress={applyFilters}
              >
                <Text className="text-white font-semibold">{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rejection reason modal */}
      <Modal visible={!!rejectModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white rounded-2xl p-6 w-full">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              {t('admin.rejectionReason')}
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder={t('admin.rejectionReason')}
              multiline
              numberOfLines={3}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border border-gray-300 rounded-xl py-3 items-center"
                onPress={() => {
                  setRejectModal(null);
                  setRejectionReason('');
                }}
              >
                <Text className="text-gray-700 font-medium">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-xl py-3 items-center"
                onPress={handleReject}
              >
                <Text className="text-white font-semibold">{t('admin.reject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
