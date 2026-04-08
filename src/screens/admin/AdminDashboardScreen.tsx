import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
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
import { buildPeriodMarkings } from '../../utils/calendarRange';
import { supabase } from '../../config/supabase';
import { theme, headerPaddingTop } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../i18n';
import { showAppAlert } from '../../utils/alert';

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

type XLocale = {
  monthNames: string[];
  monthNamesShort: string[];
  dayNames: string[];
  dayNamesShort: string[];
  amDesignator: string;
  pmDesignator: string;
};

const FR_CAL: XLocale = {
  monthNames: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ],
  monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
  amDesignator: 'AM',
  pmDesignator: 'PM',
};

const ZH_CAL: XLocale = {
  monthNames: [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  dayNamesShort: ['日', '一', '二', '三', '四', '五', '六'],
  amDesignator: '上午',
  pmDesignator: '下午',
};

export const AdminDashboardScreen: React.FC<Props> = ({ navigation, profile }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
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
  /** Calendrier dans la même feuille que les filtres (évite 2 Modal empilés = calendrier invisible sur iOS). */
  const [filterSheetView, setFilterSheetView] = useState<'main' | 'dateRange'>('main');
  const [datePick, setDatePick] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
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

  useEffect(() => {
    const loc = LocaleConfig.locales as Record<string, XLocale>;
    if (!loc.fr) loc.fr = FR_CAL;
    if (!loc.zh) loc.zh = ZH_CAL;
    const base = (i18n.language || 'fr').split('-')[0];
    if (base === 'zh') LocaleConfig.defaultLocale = 'zh';
    else if (base === 'en') LocaleConfig.defaultLocale = '';
    else LocaleConfig.defaultLocale = 'fr';
  }, [i18n.language]);

  const rangeMarked = useMemo(
    () => buildPeriodMarkings(datePick.start, datePick.end, theme.brandPrimary),
    [datePick.start, datePick.end]
  );

  const openDateRangeInSheet = useCallback(() => {
    if (dateFrom) {
      setDatePick({
        start: dateFrom,
        end: dateTo && dateTo !== dateFrom ? dateTo : null,
      });
    } else {
      setDatePick({ start: null, end: null });
    }
    setFilterSheetView('dateRange');
  }, [dateFrom, dateTo]);

  const onRangeDayPress = useCallback((day: DateData) => {
    const d = day.dateString;
    setDatePick(prev => {
      if (!prev.start || (prev.start && prev.end)) {
        return { start: d, end: null };
      }
      if (d < prev.start) {
        return { start: d, end: prev.start };
      }
      return { start: prev.start, end: d };
    });
  }, []);

  const confirmDateRange = useCallback(() => {
    const { start, end } = datePick;
    if (!start) {
      setDateFrom('');
      setDateTo('');
    } else if (!end) {
      setDateFrom(start);
      setDateTo(start);
    } else {
      setDateFrom(start);
      setDateTo(end);
    }
    setFilterSheetView('main');
  }, [datePick]);

  const dateRangeSummary =
    dateFrom &&
    (dateTo && dateTo !== dateFrom
      ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
      : formatDate(dateFrom));

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
    setFilterSheetView('main');
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedEmployee(undefined);
    setDateFrom('');
    setDateTo('');
    setFilters({});
    setFilterSheetView('main');
    setShowFilterModal(false);
  };

  const closeFilterModal = () => {
    setFilterSheetView('main');
    setShowFilterModal(false);
  };

  const handleApprove = async (expenseId: string) => {
    const { error } = await updateExpenseStatus(expenseId, 'approved', profile.id);
    if (error) showAppAlert(t('common.error'), error.message, 'error');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const { error } = await updateExpenseStatus(
      rejectModal,
      'rejected',
      profile.id,
      rejectionReason
    );
    if (error) showAppAlert(t('common.error'), error.message, 'error');
    setRejectModal(null);
    setRejectionReason('');
  };

  const handleExport = async () => {
    if (expenses.length === 0) {
      showAppAlert(t('common.error'), t('common.noData'), 'error');
      return;
    }
    setExporting(true);
    try {
      await exportToExcel(expenses);
    } catch {
      showAppAlert(t('common.error'), t('admin.exportError'), 'error');
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
    <View className="bg-white rounded-[22px] p-5 mb-3 mx-5 border border-gray-100/80 shadow-sm">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openExpenseDetail(item)}
        accessibilityRole="button"
        accessibilityLabel={t('admin.viewDetails')}
      >
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 pr-2">
            <Text className="font-semibold text-gray-900 text-base">
              {t(`expense.${item.category}`)}
            </Text>
            <Text className="text-gray-500 text-sm mt-0.5">
              {(item.profiles as Profile | undefined)?.full_name ?? '—'}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={2}>
              {formatDate(item.receipt_date)} · {item.supplier}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-bold text-gray-900">{formatCurrency(item.amount_ttc)}</Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              HT: {formatCurrency(item.amount_ht)}
            </Text>
            <Text className="text-primary-600 text-xs font-bold mt-1">
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
            className="flex-1 bg-emerald-500 rounded-full py-3 items-center"
            onPress={() => handleApprove(item.id)}
          >
            <Text className="text-white font-bold text-sm">✓ {t('admin.approve')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-500 rounded-full py-3 items-center"
            onPress={() => setRejectModal(item.id)}
          >
            <Text className="text-white font-bold text-sm">✕ {t('admin.reject')}</Text>
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
          <Text className="text-gray-900 text-3xl font-bold mt-2 leading-tight">{t('admin.title')}</Text>
          <Text className="text-gray-400 text-sm mt-2 capitalize">
            {profile.full_name} · {profile.role}
          </Text>
          <View className="flex-row gap-2.5 mt-5">
            <View className="flex-1 bg-surface rounded-2xl px-3 py-3 border border-gray-100">
              <Text className="text-gray-400 text-[11px] font-medium">{t('admin.totalExpenses')}</Text>
              <Text className="text-gray-900 font-bold text-lg mt-0.5">{totals.count}</Text>
            </View>
            <View className="flex-1 bg-surface rounded-2xl px-3 py-3 border border-gray-100">
              <Text className="text-gray-400 text-[11px] font-medium">{t('admin.totalTTC')}</Text>
              <Text className="text-gray-900 font-bold text-lg mt-0.5">{formatCurrency(totals.ttc)}</Text>
            </View>
            <View className="flex-1 bg-amber-50 rounded-2xl px-3 py-3 border border-amber-100">
              <Text className="text-amber-700 text-[11px] font-semibold">{t('admin.pendingCount')}</Text>
              <Text className="text-amber-800 font-bold text-lg mt-0.5">{totals.pending}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3 px-5 mt-3">
        <TouchableOpacity
          className="flex-1 bg-white border border-gray-200 rounded-full py-3.5 items-center flex-row justify-center gap-2 shadow-sm"
          onPress={() => {
            setFilterSheetView('main');
            setShowFilterModal(true);
          }}
        >
          <Text className="text-base">🔍</Text>
          <Text className="text-gray-800 font-bold text-sm">{t('common.filter')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-white border border-gray-200 rounded-full py-3.5 items-center flex-row justify-center gap-2 shadow-sm"
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color={theme.brandPrimary} size="small" />
          ) : (
            <>
              <Text className="text-base">📊</Text>
              <Text className="text-gray-800 font-bold text-sm">{t('admin.exportExcel')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Expense list */}
      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderExpense}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchExpenses(filters)}
          />
        }
        ListEmptyComponent={
          <View className="mx-5 mt-8 bg-white rounded-[28px] border border-gray-100 px-8 py-14 items-center shadow-sm">
            <View className="w-20 h-20 rounded-full bg-primary-50 items-center justify-center mb-5">
              <Text className="text-4xl">📋</Text>
            </View>
            <Text className="text-gray-900 font-bold text-lg">{t('common.noData')}</Text>
          </View>
        }
      />

      {/* Filter Modal (calendrier intégré : un seul Modal pour éviter le bug iOS) */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={closeFilterModal}
      >
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={closeFilterModal}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <View className="bg-white rounded-t-[28px] border-t border-gray-100 max-h-[92%]">
            {filterSheetView === 'main' ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 }}
              >
                <Text className="text-xl font-bold text-gray-900 mb-6">{t('common.filter')}</Text>

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

                <Text className="text-gray-700 font-medium mb-2">{t('admin.filterByDate')}</Text>
                <TouchableOpacity
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-2 active:opacity-80"
                  onPress={openDateRangeInSheet}
                >
                  <Text
                    className={`text-sm font-medium ${dateRangeSummary ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    {dateRangeSummary || t('admin.dateRangePlaceholder')}
                  </Text>
                </TouchableOpacity>
                <Text className="text-gray-500 text-xs mb-6 leading-4">{t('admin.dateRangeHint')}</Text>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 border border-gray-200 rounded-full py-3.5 items-center bg-surface"
                    onPress={resetFilters}
                  >
                    <Text className="text-gray-800 font-semibold">{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-primary-600 rounded-full py-3.5 items-center"
                    onPress={applyFilters}
                  >
                    <Text className="text-white font-bold">{t('common.confirm')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <>
                <View className="px-5 pt-5 pb-3 border-b border-gray-100">
                  <TouchableOpacity
                    className="self-start py-1 mb-2"
                    onPress={() => {
                      if (dateFrom) {
                        setDatePick({
                          start: dateFrom,
                          end: dateTo && dateTo !== dateFrom ? dateTo : null,
                        });
                      } else {
                        setDatePick({ start: null, end: null });
                      }
                      setFilterSheetView('main');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.back')}
                  >
                    <Text className="text-primary-600 font-semibold text-base">{t('common.back')}</Text>
                  </TouchableOpacity>
                  <Text className="text-xl font-bold text-gray-900">{t('admin.selectDateRange')}</Text>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 16 }}
                >
                  <View className="px-5 pt-3">
                    <Text className="text-gray-500 text-sm mb-4 leading-5">
                      {t('admin.dateRangeHint')}
                    </Text>
                    <Calendar
                      firstDay={1}
                      enableSwipeMonths
                      markingType="period"
                      markedDates={rangeMarked}
                      onDayPress={onRangeDayPress}
                      current={datePick.start || dateFrom || undefined}
                      theme={{
                        todayTextColor: theme.brandPrimary,
                        arrowColor: theme.brandPrimary,
                        monthTextColor: '#111827',
                        textMonthFontWeight: '700',
                        textDayHeaderFontWeight: '600',
                        textSectionTitleColor: '#6b7280',
                      }}
                    />
                  </View>
                </ScrollView>
                <View className="px-5 pb-8 pt-3 border-t border-gray-100 gap-3">
                  <TouchableOpacity
                    className="border border-gray-200 rounded-full py-3 items-center bg-surface"
                    onPress={() => setDatePick({ start: null, end: null })}
                  >
                    <Text className="text-gray-800 font-semibold text-sm">
                      {t('admin.clearDateRange')}
                    </Text>
                  </TouchableOpacity>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 border border-gray-200 rounded-full py-3.5 items-center bg-surface"
                      onPress={() => {
                        if (dateFrom) {
                          setDatePick({
                            start: dateFrom,
                            end: dateTo && dateTo !== dateFrom ? dateTo : null,
                          });
                        } else {
                          setDatePick({ start: null, end: null });
                        }
                        setFilterSheetView('main');
                      }}
                    >
                      <Text className="text-gray-800 font-semibold text-sm">{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-primary-600 rounded-full py-3.5 items-center"
                      onPress={confirmDateRange}
                    >
                      <Text className="text-white font-bold text-sm">{t('common.confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Rejection reason modal */}
      <Modal visible={!!rejectModal} animationType="fade" transparent>
        <View className="flex-1 justify-center items-center bg-black/40 px-6">
          <View className="bg-white rounded-[28px] p-6 w-full max-w-md border border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              {t('admin.rejectionReason')}
            </Text>
            <TextInput
              className="bg-surface border border-gray-100 rounded-2xl px-4 py-3 text-base mb-4 text-gray-900"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder={t('admin.rejectionReason')}
              multiline
              numberOfLines={3}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border border-gray-100 rounded-full py-3.5 items-center bg-surface"
                onPress={() => {
                  setRejectModal(null);
                  setRejectionReason('');
                }}
              >
                <Text className="text-gray-800 font-semibold">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-full py-3.5 items-center"
                onPress={handleReject}
              >
                <Text className="text-white font-bold">{t('admin.reject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
