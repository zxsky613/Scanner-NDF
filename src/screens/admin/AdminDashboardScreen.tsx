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
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
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
import { theme, headerPaddingTop, heroHeaderShadow } from '../../config/theme';
import { userRoleLabel } from '../../utils/userRoleLabel';
import { AppNameText } from '../../components/AppNameText';
import { ScreenHeroTitle } from '../../components/ScreenHeroTitle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../i18n';
import { showAppAlert } from '../../utils/alert';
import { syncCalendarLocale } from '../../utils/calendarLocales';
import {
  IS_WEB,
  WEB_HERO_CARD_CLASS,
  webHeroCardInlineStyle,
  webHeaderOuterInlineStyle,
} from '../../config/webLayout';

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

type DashboardListRow =
  | { kind: 'header'; section: 'pending' | 'processed'; count: number }
  | { kind: 'expense'; item: Expense };

function sortExpensesByCreatedDesc(a: Expense, b: Expense): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export const AdminDashboardScreen: React.FC<Props> = ({ navigation, profile }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const pageX = IS_WEB ? 'px-8' : 'px-5';
  const cardX = IS_WEB ? 'mx-8' : 'mx-5';
  const { expenses, refreshing, fetchExpenses, updateExpenseStatus } = useExpenses(
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
  /** Sections repliables : les plus récentes en premier (created_at). */
  const [pendingSectionExpanded, setPendingSectionExpanded] = useState(true);
  const [processedSectionExpanded, setProcessedSectionExpanded] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);

  const loadEmployeesWithExpenses = useCallback(async () => {
    const { data: expRows, error: e1 } = await supabase.from('expenses').select('user_id');
    if (e1) {
      setEmployees([]);
      return;
    }
    if (!expRows?.length) {
      setEmployees([]);
      return;
    }
    const ids = [...new Set(expRows.map(r => r.user_id).filter(Boolean))] as string[];
    if (ids.length === 0) {
      setEmployees([]);
      return;
    }
    const { data: profs, error: e2 } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
      .order('full_name', { ascending: true });
    if (e2) {
      setEmployees([]);
      return;
    }
    setEmployees((profs ?? []) as Profile[]);
  }, []);

  useEffect(() => {
    syncCalendarLocale(i18n.language);
  }, [i18n.language]);

  const rangeMarked = useMemo(
    () => buildPeriodMarkings(datePick.start, datePick.end, theme.brandPrimary),
    [datePick.start, datePick.end]
  );

  const openDateRangeInSheet = useCallback(() => {
    setEmployeePickerOpen(false);
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
    setEmployeePickerOpen(false);
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
    setEmployeePickerOpen(false);
    setFilterSheetView('main');
    setShowFilterModal(false);
  };

  const closeFilterModal = () => {
    setEmployeePickerOpen(false);
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

  const sortedExpenses = useMemo(
    () => [...expenses].sort(sortExpensesByCreatedDesc),
    [expenses]
  );

  const dashboardListRows = useMemo((): DashboardListRow[] => {
    const pending = sortedExpenses.filter(e => e.status === 'pending');
    const processed = sortedExpenses.filter(
      e => e.status === 'approved' || e.status === 'rejected'
    );
    const rows: DashboardListRow[] = [];
    if (pending.length > 0) {
      rows.push({ kind: 'header', section: 'pending', count: pending.length });
      if (pendingSectionExpanded) {
        pending.forEach(item => rows.push({ kind: 'expense', item }));
      }
    }
    if (processed.length > 0) {
      rows.push({ kind: 'header', section: 'processed', count: processed.length });
      if (processedSectionExpanded) {
        processed.forEach(item => rows.push({ kind: 'expense', item }));
      }
    }
    return rows;
  }, [sortedExpenses, pendingSectionExpanded, processedSectionExpanded]);

  const openExpenseDetail = (expense: Expense) => {
    navigation.navigate('ExpenseDetail', { expense });
  };

  const renderExpenseCard = (item: Expense) => (
    <View className={`bg-white rounded-[22px] p-5 mb-3 border border-gray-100/80 shadow-sm ${cardX}`}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openExpenseDetail(item)}
        accessibilityRole="button"
        accessibilityLabel={t('admin.viewDetails')}
      >
        <View className="flex-row items-start justify-between mb-1">
          <View className={`flex-1 pr-2 ${IS_WEB ? 'min-w-0' : ''}`}>
            <Text className="font-semibold text-gray-900 text-base">
              {t(`expense.${item.category}`)}
            </Text>
            <Text className="text-gray-500 text-sm mt-0.5">
              {(item.profiles as Profile | undefined)?.full_name ?? '—'}
            </Text>
            <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={IS_WEB ? 1 : 2}>
              {item.supplier}
              {item.city?.trim() ? ` · ${item.city.trim()}` : ''}
            </Text>
            {!IS_WEB ? (
              <>
                <Text className="text-gray-400 text-[11px] mt-1" numberOfLines={1}>
                  {t('expense.receiptDate')}: {formatDate(item.receipt_date)}
                </Text>
                <Text className="text-gray-400 text-[11px] mt-0.5" numberOfLines={1}>
                  {t('expense.requestCreatedAt')}:{' '}
                  {item.created_at ? formatDate(item.created_at) : '—'}
                </Text>
              </>
            ) : null}
          </View>
          {IS_WEB ? (
            <View className="w-[168px] shrink-0 border-l border-gray-100 pl-4">
              <Text className="text-gray-400 text-[11px]">{t('expense.receiptDate')}:</Text>
              <Text className="text-gray-600 text-[11px]">{formatDate(item.receipt_date)}</Text>
              <Text className="text-gray-400 text-[11px] mt-2">
                {t('expense.requestCreatedAt')}:
              </Text>
              <Text className="text-gray-600 text-[11px]">
                {item.created_at ? formatDate(item.created_at) : '—'}
              </Text>
            </View>
          ) : null}
          <View className={`items-end ${IS_WEB ? 'w-[132px] shrink-0' : ''}`}>
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
        <View className={`flex-row gap-2 mt-2 ${IS_WEB ? 'justify-end flex-wrap' : ''}`}>
          <TouchableOpacity
            className={`bg-emerald-500 rounded-full py-3 items-center ${
              IS_WEB ? 'px-8 min-w-[140px]' : 'flex-1'
            }`}
            onPress={() => handleApprove(item.id)}
          >
            <Text className="text-white font-bold text-sm">✓ {t('admin.approve')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`bg-red-500 rounded-full py-3 items-center ${
              IS_WEB ? 'px-8 min-w-[140px]' : 'flex-1'
            }`}
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

  const renderDashboardRow = ({ item }: { item: DashboardListRow }) => {
    if (item.kind === 'header') {
      const isPending = item.section === 'pending';
      const expanded = isPending ? pendingSectionExpanded : processedSectionExpanded;
      return (
        <TouchableOpacity
          className={`${cardX} mb-1 flex-row items-center justify-between py-3 px-1 active:opacity-80 ${
            isPending ? 'mt-2 pt-2' : 'mt-4'
          }`}
          onPress={() =>
            isPending
              ? setPendingSectionExpanded(v => !v)
              : setProcessedSectionExpanded(v => !v)
          }
          accessibilityRole="button"
          accessibilityLabel={
            isPending
              ? expanded
                ? t('admin.collapsePendingSection')
                : t('admin.expandPendingSection')
              : expanded
                ? t('admin.collapseProcessedSection')
                : t('admin.expandProcessedSection')
          }
        >
          <Text className="text-ink font-bold text-base">
            {isPending
              ? t('admin.dashboardSectionPending')
              : t('admin.dashboardSectionProcessed')}{' '}
            ({item.count})
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={theme.brandInk}
          />
        </TouchableOpacity>
      );
    }
    return renderExpenseCard(item.item);
  };

  return (
    <View className="flex-1 bg-surface">
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
          <AppNameText
            className={IS_WEB ? 'text-ink-300 text-[10px] uppercase tracking-[0.16em]' : 'text-ink-300 text-xs uppercase tracking-[0.14em]'}
          >
            {t('common.appName')}
          </AppNameText>
          <ScreenHeroTitle className={IS_WEB ? 'mt-1' : 'mt-2'}>{t('admin.title')}</ScreenHeroTitle>
          <Text className={IS_WEB ? 'text-gray-500 text-xs mt-0.5' : 'text-gray-400 text-sm mt-2'}>
            {profile.full_name} · {userRoleLabel(profile.role, t)}
          </Text>
          <View className={`flex-row gap-2.5 ${IS_WEB ? 'mt-3 flex-wrap' : 'mt-5 flex-wrap'}`}>
            <View
              className={`bg-surface rounded-2xl border border-gray-100 ${IS_WEB ? 'min-w-[140px] flex-1 px-2.5 py-2' : 'flex-1 px-3 py-3'}`}
            >
              <Text className="text-gray-400 text-[11px] font-medium">{t('admin.totalExpenses')}</Text>
              <Text className="font-bold text-lg mt-0.5" style={{ color: theme.brandInk }}>
                {totals.count}
              </Text>
            </View>
            {IS_WEB ? (
              <View className="min-w-[140px] flex-1 bg-surface rounded-2xl px-2.5 py-2 border border-gray-100">
                <Text className="text-gray-400 text-[11px] font-medium">{t('admin.totalHT')}</Text>
                <Text className="font-bold text-lg mt-0.5" style={{ color: theme.brandInk }}>
                  {formatCurrency(totals.ht)}
                </Text>
              </View>
            ) : null}
            <View
              className={`bg-surface rounded-2xl border border-gray-100 ${IS_WEB ? 'min-w-[140px] flex-1 px-2.5 py-2' : 'flex-1 px-3 py-3'}`}
            >
              <Text className="text-gray-400 text-[11px] font-medium">{t('admin.totalTTC')}</Text>
              <Text className="font-bold text-lg mt-0.5" style={{ color: theme.brandInk }}>
                {formatCurrency(totals.ttc)}
              </Text>
            </View>
            <View
              className={`bg-amber-50 rounded-2xl border border-amber-100 ${IS_WEB ? 'min-w-[140px] flex-1 px-2.5 py-2' : 'flex-1 px-3 py-3'}`}
            >
              <Text className="text-amber-700 text-[11px] font-semibold">{t('admin.pendingCount')}</Text>
              <Text className="text-amber-800 font-bold text-lg mt-0.5">{totals.pending}</Text>
            </View>
          </View>
        </View>
      </View>

      <View
        className={`flex-row gap-3 ${IS_WEB ? 'mt-2' : 'mt-3'} ${pageX} ${IS_WEB ? 'justify-center flex-wrap' : ''}`}
      >
        <TouchableOpacity
          className={`bg-white border border-gray-200 rounded-full py-3.5 items-center flex-row justify-center gap-2 shadow-sm ${
            IS_WEB ? 'px-10 min-w-[200px]' : 'flex-1'
          }`}
          onPress={() => {
            setFilterSheetView('main');
            void loadEmployeesWithExpenses();
            setShowFilterModal(true);
          }}
        >
          <Text className="text-base">🔍</Text>
          <Text className="text-gray-800 font-bold text-sm">{t('common.filter')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`bg-white border border-gray-200 rounded-full py-3.5 items-center flex-row justify-center gap-2 shadow-sm ${
            IS_WEB ? 'px-10 min-w-[200px]' : 'flex-1'
          }`}
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

      {/* Liste en sections : en attente / déjà traitées, repliables ; tri par date de création (récent d’abord). */}
      <FlatList
        data={dashboardListRows}
        keyExtractor={(row, index) =>
          row.kind === 'header' ? `hdr-${row.section}-${index}` : row.item.id
        }
        renderItem={renderDashboardRow}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchExpenses(filters, { pull: true })}
          />
        }
        ListEmptyComponent={
          expenses.length === 0 ? (
            <View className={`${cardX} mt-8 bg-white rounded-[28px] border border-gray-100 px-8 py-14 items-center shadow-sm`}>
              <View className="w-20 h-20 rounded-full bg-primary-50 items-center justify-center mb-5">
                <Text className="text-4xl">📋</Text>
              </View>
              <Text className="text-gray-900 font-bold text-lg">{t('common.noData')}</Text>
            </View>
          ) : null
        }
      />

      {/* Filter Modal (calendrier intégré : un seul Modal pour éviter le bug iOS) */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={closeFilterModal}
      >
        <View
          className="flex-1 justify-end"
          style={
            IS_WEB
              ? { justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }
              : undefined
          }
        >
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={closeFilterModal}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <View
            className="bg-white rounded-t-[28px] border-t border-gray-100 max-h-[92%] relative overflow-visible"
            style={
              IS_WEB
                ? {
                    borderRadius: 24,
                    maxHeight: '85%',
                    maxWidth: 560,
                    width: '100%',
                    alignSelf: 'center',
                    borderTopWidth: 0,
                    borderWidth: 1,
                    borderColor: 'rgba(36, 41, 73, 0.08)',
                  }
                : undefined
            }
          >
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
                <Text className="text-gray-500 text-xs mb-2 leading-4">{t('admin.filterEmployeeHint')}</Text>
                <View className="flex-row items-stretch gap-2 mb-4">
                  <TouchableOpacity
                    className={`px-4 py-3 rounded-xl border justify-center ${
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
                  <TouchableOpacity
                    className={`flex-1 min-w-0 flex-row items-center justify-between px-4 py-3 rounded-xl border ${
                      selectedEmployee ? 'border-primary-300 bg-primary-50/50' : 'border-gray-200 bg-gray-50'
                    }`}
                    onPress={() => employees.length > 0 && setEmployeePickerOpen(true)}
                    disabled={employees.length === 0}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.selectEmployeePlaceholder')}
                  >
                    <Text
                      className={`text-sm font-medium flex-1 pr-2 ${selectedEmployee ? 'text-gray-900' : 'text-gray-400'}`}
                      numberOfLines={1}
                    >
                      {selectedEmployee
                        ? employees.find(e => e.id === selectedEmployee)?.full_name ?? selectedEmployee
                        : t('admin.selectEmployeePlaceholder')}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={theme.inkMuted} />
                  </TouchableOpacity>
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
            {employeePickerOpen && filterSheetView === 'main' ? (
              <View
                className="justify-end"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  zIndex: 100,
                }}
                pointerEvents="box-none"
              >
                <Pressable
                  className="flex-1 bg-black/40"
                  onPress={() => setEmployeePickerOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                />
                <View className="bg-white rounded-t-[24px] border-t border-gray-200 px-4 pt-4 pb-5 shadow-lg">
                  <Text className="text-ink font-bold text-base mb-1">{t('admin.filterByEmployee')}</Text>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 280 }}
                    nestedScrollEnabled
                  >
                    {employees.length === 0 ? (
                      <Text className="text-gray-500 text-sm py-4">{t('admin.noEmployeesWithExpenses')}</Text>
                    ) : (
                      employees.map(emp => (
                        <TouchableOpacity
                          key={emp.id}
                          className="py-3.5 border-b border-gray-100 active:bg-gray-50"
                          onPress={() => {
                            setSelectedEmployee(emp.id);
                            setEmployeePickerOpen(false);
                          }}
                        >
                          <Text
                            className={`text-base ${
                              selectedEmployee === emp.id ? 'font-bold' : 'font-medium text-gray-900'
                            }`}
                            style={
                              selectedEmployee === emp.id ? { color: theme.brandPrimary } : undefined
                            }
                          >
                            {emp.full_name}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            ) : null}
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
