import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Expense, ExpenseCategory, ExpenseFilters, Profile } from '../../types';
import { useExpenses } from '../../hooks/useExpenses';
import { formatDate, formatCurrency } from '../../utils/dateFormat';
import { theme, headerPaddingTop, heroHeaderShadow } from '../../config/theme';
import { AppNameText } from '../../components/AppNameText';
import { ScreenHeroTitle } from '../../components/ScreenHeroTitle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncCalendarLocale } from '../../utils/calendarLocales';
import { showAppAlert } from '../../utils/alert';
import {
  IS_WEB,
  WEB_HERO_CARD_CLASS,
  webHeroCardInlineStyle,
  webHeroStatBoxStyle,
  webHeaderOuterInlineStyle,
} from '../../config/webLayout';

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

const filterCategoryValues: (ExpenseCategory | 'all')[] = [
  'all',
  'food',
  'materials',
  'travel',
  'other',
];

function filtersNonEmpty(f: ExpenseFilters): boolean {
  return !!(
    f.category ||
    f.date_from ||
    f.date_to ||
    (f.supplier_search && f.supplier_search.trim())
  );
}

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
  iconView: '#5c6a8c' as const,
  iconEdit: '#B45309' as const,
  iconDelete: '#C94A54' as const,
};

export const EmployeeHomeScreen: React.FC<Props> = ({ navigation, profile }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const pageX = IS_WEB ? 'px-8' : 'px-5';
  const cardX = IS_WEB ? 'mx-8' : 'mx-5';
  const { expenses, refreshing, fetchExpenses, deleteExpense } = useExpenses(profile.id);
  const [listFilters, setListFilters] = useState<ExpenseFilters>({});
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  /** Même feuille que l’admin : calendrier dans le modal (pas de 2e modal). */
  const [filterModalView, setFilterModalView] = useState<'main' | 'date'>('main');
  const [draftCategory, setDraftCategory] = useState<ExpenseCategory | 'all'>('all');
  const [draftDate, setDraftDate] = useState('');
  const [draftSupplier, setDraftSupplier] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());

  useEffect(() => {
    syncCalendarLocale(i18n.language);
  }, [i18n.language]);

  const filterDateMarked = useMemo(() => {
    if (!draftDate || !/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) return {};
    return {
      [draftDate]: { selected: true, selectedColor: theme.brandPrimary },
    };
  }, [draftDate]);

  useFocusEffect(
    useCallback(() => {
      void fetchExpenses(listFilters);
    }, [fetchExpenses, listFilters])
  );

  const openFilterModal = () => {
    setFilterModalView('main');
    setDraftCategory(listFilters.category ?? 'all');
    const d = listFilters.date_from ?? listFilters.date_to ?? '';
    setDraftDate(d);
    setDraftSupplier(listFilters.supplier_search ?? '');
    setFilterModalOpen(true);
  };

  const closeFilterModal = () => {
    setFilterModalView('main');
    setFilterModalOpen(false);
  };

  const onFilterReceiptDayPress = (day: DateData) => {
    setDraftDate(day.dateString);
    setFilterModalView('main');
  };

  const applyListFilters = () => {
    const f: ExpenseFilters = {};
    if (draftCategory !== 'all') f.category = draftCategory;
    const d = draftDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      f.date_from = d;
      f.date_to = d;
    }
    const s = draftSupplier.trim();
    if (s) f.supplier_search = s;
    setListFilters(f);
    setFilterModalView('main');
    setFilterModalOpen(false);
    void (async () => {
      const result = await fetchExpenses(f);
      if (result.ok && filtersNonEmpty(f) && result.count === 0) {
        showAppAlert(
          t('employee.filterNoResultsTitle'),
          t('employee.filterNoResultsBody'),
          'default'
        );
      }
    })();
  };

  const resetListFilters = () => {
    setListFilters({});
    setDraftCategory('all');
    setDraftDate('');
    setDraftSupplier('');
    setFilterModalView('main');
    setFilterModalOpen(false);
    void fetchExpenses({});
  };

  const filtersActive = filtersNonEmpty(listFilters);

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

  const webListTableHeader = IS_WEB ? (
    <View className={`${cardX} mb-1`}>
      <View className="rounded-xl border border-gray-200/90 bg-gray-50/95 overflow-hidden">
        <View className="flex-row items-stretch">
          <View className="flex-1 flex-row items-center px-4 py-2.5 gap-3 min-w-0">
            <View className="w-10 shrink-0" />
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {t('expense.category')} · {t('expense.supplier')}
              </Text>
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5">
                {t('expense.receiptDate')} · {t('expense.requestCreatedAt')}
              </Text>
            </View>
            <View className="items-end shrink-0 pl-2">
              <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {t('expense.amountTTC')}
              </Text>
              <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1">
                {t('expense.status')}
              </Text>
            </View>
          </View>
          <View className="w-[108px] border-l border-gray-200/80 bg-gray-50/95" />
        </View>
      </View>
    </View>
  ) : null;

  const closeSwipe = (id: string) => {
    swipeRefs.current.get(id)?.close();
  };

  const registerSwipeRef = (id: string) => (ref: Swipeable | null) => {
    if (ref) swipeRefs.current.set(id, ref);
    else swipeRefs.current.delete(id);
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const pending = item.status === 'pending';

    /** Ligne type « tableau » : dense, actions visibles (pas de swipe sur web). */
    if (IS_WEB) {
      return (
        <View className={`mb-2 ${cardX}`}>
          <View className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
            <View className="flex-row items-stretch">
              <TouchableOpacity
                className="flex-1 flex-row items-center px-4 py-3.5 gap-3 min-w-0 active:bg-gray-50/90"
                onPress={() => navigation.navigate('ExpenseDetail', { expense: item })}
                accessibilityRole="button"
              >
                <View className="w-10 h-10 rounded-lg bg-surface items-center justify-center border border-gray-100 shrink-0">
                  <Text className="text-lg leading-none">{categoryIcons[item.category] ?? '📄'}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-semibold text-gray-900 text-sm" numberOfLines={1}>
                    {t(`expense.${item.category}`)}
                  </Text>
                  <Text className="text-gray-600 text-xs mt-0.5" numberOfLines={1}>
                    {item.supplier}
                    {item.city?.trim() ? ` · ${item.city.trim()}` : ''}
                  </Text>
                  <Text className="text-gray-400 text-[11px] mt-1" numberOfLines={1}>
                    {formatDate(item.receipt_date)}
                    {item.created_at ? ` · ${formatDate(item.created_at)}` : ''}
                  </Text>
                </View>
                <View className="items-end shrink-0 pl-2">
                  <Text className="font-bold text-gray-900 text-sm tabular-nums">
                    {formatCurrency(item.amount_ttc)}
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-md mt-1 ${statusColors[item.status]?.split(' ')[0]}`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase tracking-wide ${statusColors[item.status]?.split(' ')[1]}`}
                    >
                      {t(`expense.${item.status}`)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View className="flex-row items-center border-l border-gray-100 bg-gray-50/80 pl-1 pr-2">
                <Pressable
                  className="p-2 rounded-lg active:bg-gray-200/80"
                  onPress={() => navigation.navigate('ExpenseDetail', { expense: item })}
                  accessibilityRole="button"
                  accessibilityLabel={t('employee.swipeView')}
                >
                  <Ionicons name="eye-outline" size={20} color={swipeStyles.iconView} />
                </Pressable>
                {pending ? (
                  <>
                    <Pressable
                      className="p-2 rounded-lg active:bg-gray-200/80"
                      onPress={() => navigation.navigate('NewExpense', { editExpense: item })}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.edit')}
                    >
                      <Ionicons name="create-outline" size={20} color={swipeStyles.iconEdit} />
                    </Pressable>
                    <Pressable
                      className="p-2 rounded-lg active:bg-red-100/80"
                      onPress={() => openDeleteConfirm(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.delete')}
                    >
                      <Ionicons name="trash-outline" size={20} color={swipeStyles.iconDelete} />
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>
            {(item.is_fiscal_alert || item.is_flagged_duplicate) && (
              <View className="flex-row flex-wrap gap-2 px-4 pb-3 pt-0 border-t border-gray-100 bg-surface/50">
                {item.is_fiscal_alert ? (
                  <View className="bg-red-50 rounded-md px-2 py-1">
                    <Text className="text-red-700 text-[11px] font-medium">
                      ⚠️ {t('alerts.fiscalTitle')}
                    </Text>
                  </View>
                ) : null}
                {item.is_flagged_duplicate ? (
                  <View className="bg-amber-50 rounded-md px-2 py-1">
                    <Text className="text-amber-800 text-[11px] font-medium">
                      🔄 {t('alerts.duplicateTitle')}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>
      );
    }

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
      <View className={`mb-3 ${cardX}`}>
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
                    <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={2}>
                      {item.supplier}
                      {item.city?.trim() ? ` · ${item.city.trim()}` : ''}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1" numberOfLines={1}>
                      {t('expense.receiptDate')}: {formatDate(item.receipt_date)}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                      {t('expense.requestCreatedAt')}:{' '}
                      {item.created_at ? formatDate(item.created_at) : '—'}
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
          {IS_WEB ? (
            <>
              <View className="flex-row flex-wrap gap-3 items-start justify-between">
                <View className="flex-1 min-w-[220px]">
                  <AppNameText className="text-ink-300 text-[10px] uppercase tracking-[0.16em]">
                    {t('common.appName')}
                  </AppNameText>
                  <ScreenHeroTitle className="mt-1 leading-snug">{t('employee.title')}</ScreenHeroTitle>
                  <Text className="text-gray-500 text-xs mt-0.5">{profile.full_name}</Text>
                </View>
                <View className="flex-row gap-2 shrink-0">
                  <View
                    className="bg-white/90 rounded-lg border border-gray-200/80 min-w-[88px]"
                    style={webHeroStatBoxStyle}
                  >
                    <Text className="text-gray-500 text-[9px] font-semibold uppercase tracking-wide">
                      {t('admin.totalExpenses')}
                    </Text>
                    <Text className="text-base font-bold mt-0.5" style={{ color: theme.brandInk }}>
                      {expenses.length}
                    </Text>
                  </View>
                  <View
                    className="bg-white/90 rounded-lg border border-primary-200/60 min-w-[88px]"
                    style={webHeroStatBoxStyle}
                  >
                    <Text className="text-primary-700 text-[9px] font-semibold uppercase tracking-wide">
                      {t('expense.pending')}
                    </Text>
                    <Text className="text-base font-bold mt-0.5 text-primary-700">{pendingCount}</Text>
                  </View>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2 mt-2 justify-end items-center">
                <TouchableOpacity
                  onPress={openFilterModal}
                  className="flex-row items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
                  style={{
                    borderColor: filtersActive ? theme.heroHeaderBorder : undefined,
                    backgroundColor: filtersActive ? theme.heroHeaderBg : undefined,
                  }}
                >
                  <Ionicons name="filter-outline" size={18} color={theme.brandInk} />
                  <Text className="text-sm font-semibold" style={{ color: theme.brandInk }}>
                    {t('employee.filterNotes')}
                  </Text>
                  {filtersActive ? (
                    <View className="bg-primary-600 rounded-md px-1.5 py-0.5">
                      <Text className="text-white text-[10px] font-bold">{t('employee.filtersActive')}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('NewExpense')}
                  className="flex-row items-center gap-2 bg-primary-600 rounded-lg px-4 py-2 active:opacity-90"
                  style={{
                    shadowColor: theme.brandPrimary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text className="text-white text-sm font-bold">{t('employee.newExpense')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <AppNameText className="text-ink-300 text-xs uppercase tracking-[0.14em]">
                {t('common.appName')}
              </AppNameText>
              <ScreenHeroTitle className="mt-2">{t('employee.title')}</ScreenHeroTitle>
              <Text className="text-gray-400 text-base mt-2">{profile.full_name}</Text>
              <View className="flex-row gap-3 mt-5">
                <View className="flex-1 bg-surface rounded-2xl px-4 py-3.5 border border-gray-100">
                  <Text className="text-gray-400 text-xs font-medium">{t('admin.totalExpenses')}</Text>
                  <Text className="text-2xl font-bold mt-0.5" style={{ color: theme.brandInk }}>
                    {expenses.length}
                  </Text>
                </View>
                <View className="flex-1 bg-primary-50 rounded-2xl px-4 py-3.5 border border-primary-100">
                  <Text className="text-primary-600 text-xs font-semibold">{t('expense.pending')}</Text>
                  <Text className="text-primary-600 text-2xl font-bold mt-0.5">{pendingCount}</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-4">
                <TouchableOpacity
                  onPress={openFilterModal}
                  className="flex-row items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2.5"
                  style={{
                    borderColor: filtersActive ? theme.heroHeaderBorder : undefined,
                    backgroundColor: filtersActive ? theme.heroHeaderBg : undefined,
                  }}
                >
                  <Text className="text-base">🔍</Text>
                  <Text className="text-sm font-semibold" style={{ color: theme.brandInk }}>
                    {t('employee.filterNotes')}
                  </Text>
                  {filtersActive ? (
                    <View className="bg-primary-600 rounded-full px-2 py-0.5">
                      <Text className="text-white text-[10px] font-bold">{t('employee.filtersActive')}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderExpense}
        ListHeaderComponent={webListTableHeader}
        contentContainerStyle={{
          paddingTop: IS_WEB ? 8 : 12,
          paddingBottom: IS_WEB ? 32 : 110,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchExpenses(listFilters, { pull: true })}
          />
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

      {!IS_WEB ? (
        <TouchableOpacity
          className="absolute bg-primary-600 w-16 h-16 rounded-full items-center justify-center"
          onPress={() => navigation.navigate('NewExpense')}
          style={{
            bottom: 40,
            right: 24,
            shadowColor: theme.brandPrimary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <Text className="text-white text-3xl font-light leading-none">+</Text>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={filterModalOpen}
        animationType={IS_WEB ? 'fade' : 'slide'}
        transparent
        onRequestClose={closeFilterModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View
            className={IS_WEB ? 'flex-1 justify-center items-center px-4 py-8' : 'flex-1 justify-end'}
          >
            <Pressable className="absolute inset-0 bg-black/40" onPress={closeFilterModal} />
            <View
              className={
                IS_WEB
                  ? 'bg-white rounded-2xl border border-gray-200/90 w-full max-w-lg max-h-[85vh] z-10 shadow-2xl overflow-hidden'
                  : 'bg-white rounded-t-[28px] border-t border-gray-100 max-h-[88%]'
              }
            >
              {filterModalView === 'main' ? (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}
                >
                  <Text className="text-xl font-bold mb-6" style={{ color: theme.brandInk }}>
                    {t('employee.filterTitle')}
                  </Text>
                  <Text className="text-gray-700 font-medium mb-2">{t('expense.category')}</Text>
                  <View className="flex-row flex-wrap gap-2 mb-5">
                    {filterCategoryValues.map(c => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setDraftCategory(c)}
                        className={`px-4 py-2 rounded-full border ${
                          draftCategory === c
                            ? 'bg-primary-600 border-primary-600'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            draftCategory === c ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {c === 'all'
                            ? t('employee.filterCategoryAll')
                            : `${categoryIcons[c]} ${t(`expense.${c}`)}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text className="text-gray-700 font-medium mb-2">{t('employee.filterReceiptDate')}</Text>
                  <TouchableOpacity
                    className="bg-surface border border-gray-100 rounded-2xl px-4 py-3.5 mb-1 active:opacity-80"
                    onPress={() => setFilterModalView('date')}
                    accessibilityRole="button"
                    accessibilityLabel={t('employee.filterPickDate')}
                  >
                    <Text
                      className={`text-base ${draftDate.trim() ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
                    >
                      {draftDate.trim() && /^\d{4}-\d{2}-\d{2}$/.test(draftDate.trim())
                        ? formatDate(draftDate.trim())
                        : t('employee.filterDateTapToChoose')}
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-gray-400 text-xs mb-5 leading-4">{t('employee.filterDateHint')}</Text>
                  <Text className="text-gray-700 font-medium mb-2">{t('expense.supplier')}</Text>
                  <TextInput
                    className="bg-surface border border-gray-100 rounded-2xl px-4 py-3.5 text-base text-gray-900 mb-6"
                    value={draftSupplier}
                    onChangeText={setDraftSupplier}
                    placeholder={t('employee.filterSupplierPlaceholder')}
                    autoCapitalize="none"
                  />
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 border border-gray-200 rounded-full py-3.5 items-center bg-surface"
                      onPress={resetListFilters}
                    >
                      <Text className="text-gray-800 font-semibold">{t('employee.filterReset')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-primary-600 rounded-full py-3.5 items-center"
                      onPress={applyListFilters}
                    >
                      <Text className="text-white font-bold">{t('employee.filterApply')}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : (
                <>
                  <View className="px-6 pt-5 pb-3 border-b border-gray-100">
                    <TouchableOpacity
                      className="self-start py-1 mb-2"
                      onPress={() => setFilterModalView('main')}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.back')}
                    >
                      <Text className="text-primary-600 font-semibold text-base">← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text className="text-xl font-bold" style={{ color: theme.brandInk }}>
                      {t('employee.filterPickDate')}
                    </Text>
                  </View>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 16 }}
                  >
                    <View className="px-6 pt-3">
                      <Text className="text-gray-500 text-sm mb-4 leading-5">
                        {t('employee.filterDateHint')}
                      </Text>
                      <Calendar
                        firstDay={1}
                        enableSwipeMonths
                        markedDates={filterDateMarked}
                        onDayPress={onFilterReceiptDayPress}
                        current={draftDate || undefined}
                        theme={{
                          todayTextColor: theme.brandPrimary,
                          arrowColor: theme.brandPrimary,
                          selectedDayBackgroundColor: theme.brandPrimary,
                          selectedDayTextColor: '#ffffff',
                          monthTextColor: '#111827',
                          textMonthFontWeight: '700',
                          textDayHeaderFontWeight: '600',
                          textSectionTitleColor: '#6b7280',
                        }}
                      />
                    </View>
                  </ScrollView>
                  <View className="px-6 pb-8 pt-2 border-t border-gray-100">
                    <TouchableOpacity
                      className="border border-gray-200 rounded-full py-3 items-center bg-surface"
                      onPress={() => setDraftDate('')}
                    >
                      <Text className="text-gray-800 font-semibold text-sm">
                        {t('employee.filterClearDate')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
