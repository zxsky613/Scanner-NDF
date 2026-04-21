import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Profile, Project } from '../../types';
import { useProjects, PROJECT_WITH_CREATOR, type ProjectFinanceFields } from '../../hooks/useProjects';
import { supabase } from '../../config/supabase';
import { computeNetMargin } from '../../lib/projectFinance';
import { showAppAlert } from '../../utils/alert';
import { theme, headerPaddingTop, heroHeaderShadow } from '../../config/theme';
import { ScreenHeroTitle } from '../../components/ScreenHeroTitle';
import {
  IS_WEB,
  WEB_PAGE_GUTTER_CLASS,
  WEB_CARD_GUTTER_CLASS,
  WEB_HERO_CARD_CLASS,
  webHeroCardInlineStyle,
  webHeaderOuterInlineStyle,
} from '../../config/webLayout';
import { AppNameText } from '../../components/AppNameText';
import {
  formatAmountThousandsFromNumber,
  formatAmountThousandsSpaces,
  parseLocaleAmount,
} from '../../utils/formatAmountInput';
import { formatDate } from '../../utils/dateFormat';

type ValidatedExpenseRow = {
  id: string;
  supplier: string;
  receipt_date: string;
  amount_ttc: number;
};

interface Props {
  navigation: NativeStackNavigationProp<any>;
  profile: Profile;
}

type FinanceAmountTexts = {
  contract_amount: string;
  cost_labor: string;
  cost_rent: string;
  cost_materials: string;
};

function financeAmountTextsFromProject(p: Project): FinanceAmountTexts {
  const fmt = (n: number | null | undefined) =>
    n != null && !Number.isNaN(Number(n)) ? formatAmountThousandsFromNumber(Number(n)) : '';
  return {
    contract_amount: fmt(p.contract_amount),
    cost_labor: fmt(p.cost_labor),
    cost_rent: fmt(p.cost_rent),
    cost_materials: fmt(p.cost_materials),
  };
}

export const FinanceProjectsScreen: React.FC<Props> = ({ profile: _profile, navigation }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const pageX = IS_WEB ? WEB_PAGE_GUTTER_CLASS : 'px-5';
  const cardX = IS_WEB ? WEB_CARD_GUTTER_CLASS : 'mx-5';
  const {
    projects,
    loading,
    fetchProjects,
    updateProjectFinanceFields,
  } = useProjects();

  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [validatedSumByProject, setValidatedSumByProject] = useState<Record<string, number>>({});
  const [draftById, setDraftById] = useState<Record<string, ProjectFinanceFields>>({});
  const [amountTextsById, setAmountTextsById] = useState<Record<string, FinanceAmountTexts>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [validatedListModalOpen, setValidatedListModalOpen] = useState(false);
  const [validatedListProject, setValidatedListProject] = useState<Project | null>(null);
  const [validatedListRows, setValidatedListRows] = useState<ValidatedExpenseRow[]>([]);
  const [validatedListLoading, setValidatedListLoading] = useState(false);

  const loadExpenseSums = useCallback(async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('project_id, amount_ttc')
      .eq('status', 'approved')
      .not('project_id', 'is', null);
    if (error) {
      console.warn('FinanceProjectsScreen expenses sum', error);
      return;
    }
    const m: Record<string, number> = {};
    for (const row of data ?? []) {
      const pid = row.project_id as string | null;
      if (!pid) continue;
      m[pid] = (m[pid] ?? 0) + Number(row.amount_ttc);
    }
    setValidatedSumByProject(m);
  }, []);

  const syncDraftsFromProjects = useCallback((list: Project[], replaceAll = false) => {
    setDraftById(prev => {
      if (replaceAll) {
        const next: Record<string, ProjectFinanceFields> = {};
        for (const p of list) {
          next[p.id] = {
            contract_amount: p.contract_amount ?? null,
            payment_terms: p.payment_terms ?? '',
            cost_labor: p.cost_labor ?? null,
            cost_rent: p.cost_rent ?? null,
            cost_materials: p.cost_materials ?? null,
          };
        }
        return next;
      }
      const next = { ...prev };
      for (const p of list) {
        if (next[p.id] === undefined) {
          next[p.id] = {
            contract_amount: p.contract_amount ?? null,
            payment_terms: p.payment_terms ?? '',
            cost_labor: p.cost_labor ?? null,
            cost_rent: p.cost_rent ?? null,
            cost_materials: p.cost_materials ?? null,
          };
        }
      }
      return next;
    });
  }, []);

  const syncAmountTextsFromProjects = useCallback((list: Project[]) => {
    setAmountTextsById(prev => {
      const next = { ...prev };
      for (const p of list) {
        if (next[p.id] === undefined) {
          next[p.id] = financeAmountTextsFromProject(p);
        }
      }
      return next;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchProjects();
      void loadExpenseSums();
    }, [fetchProjects, loadExpenseSums])
  );

  /** Ouvre la fiche finance depuis une notification (param `openProjectId` passé par l’onglet Alertes). */
  useFocusEffect(
    useCallback(() => {
      const pid = (route.params as { openProjectId?: string } | undefined)?.openProjectId?.trim();
      if (!pid) return undefined;
      let cancelled = false;
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select(PROJECT_WITH_CREATOR)
            .eq('id', pid)
            .maybeSingle();
          if (cancelled) return;
          if (error || !data) {
            showAppAlert(t('common.error'), t('notifications.projectOpenError'), 'error');
          } else {
            setDetailProject(data as Project);
            await fetchProjects();
          }
        } finally {
          navigation.setParams({ openProjectId: undefined } as never);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [route.params, navigation, fetchProjects, t])
  );

  useEffect(() => {
    syncDraftsFromProjects(projects, false);
    syncAmountTextsFromProjects(projects);
  }, [projects, syncDraftsFromProjects, syncAmountTextsFromProjects]);

  useEffect(() => {
    if (detailProject && !projects.some(p => p.id === detailProject.id)) {
      setDetailProject(null);
    }
  }, [detailProject, projects]);

  useEffect(() => {
    if (!detailProject) {
      setValidatedListModalOpen(false);
      setValidatedListProject(null);
      setValidatedListRows([]);
    }
  }, [detailProject]);

  const openValidatedExpenseDetail = useCallback(async (p: Project) => {
    setValidatedListProject(p);
    setValidatedListModalOpen(true);
    setValidatedListLoading(true);
    setValidatedListRows([]);
    const { data, error } = await supabase
      .from('expenses')
      .select('id, supplier, receipt_date, amount_ttc')
      .eq('project_id', p.id)
      .eq('status', 'approved')
      .order('receipt_date', { ascending: false });
    setValidatedListLoading(false);
    if (error) {
      showAppAlert(t('common.error'), (error as { message?: string }).message ?? String(error), 'error');
      setValidatedListModalOpen(false);
      setValidatedListProject(null);
      return;
    }
    setValidatedListRows(
      (data ?? []).map(row => ({
        id: row.id as string,
        supplier: String((row as { supplier?: string }).supplier ?? '').trim() || '—',
        receipt_date: String((row as { receipt_date?: string }).receipt_date ?? ''),
        amount_ttc: Number((row as { amount_ttc?: number }).amount_ttc ?? 0),
      }))
    );
  }, [t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProjects();
      await loadExpenseSums();
    } finally {
      setRefreshing(false);
    }
  }, [fetchProjects, loadExpenseSums]);

  const formatMoney = useCallback(
    (n: number | null | undefined) => {
      if (n == null || Number.isNaN(Number(n))) return '—';
      try {
        return new Intl.NumberFormat(i18n.language === 'zh' ? 'zh-CN' : i18n.language, {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 2,
        }).format(Number(n));
      } catch {
        return `${Number(n).toFixed(2)} €`;
      }
    },
    [i18n.language]
  );

  const updateDraft = useCallback((id: string, patch: Partial<ProjectFinanceFields>) => {
    setDraftById(prev => ({
      ...prev,
      [id]: { ...prev[id], ...patch } as ProjectFinanceFields,
    }));
  }, []);

  const patchAmountTexts = useCallback((id: string, patch: Partial<FinanceAmountTexts>) => {
    setAmountTextsById(prev => {
      const cur = prev[id];
      const base: FinanceAmountTexts = cur ?? {
        contract_amount: '',
        cost_labor: '',
        cost_rent: '',
        cost_materials: '',
      };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }, []);

  const sorted = useMemo(() => {
    const lang = i18n.language?.startsWith('zh') ? 'zh' : i18n.language?.split('-')[0] ?? 'fr';
    return [...projects].sort((a, b) => {
      const byName = a.name.localeCompare(b.name, lang, { sensitivity: 'base' });
      if (byName !== 0) return byName;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [projects, i18n.language]);

  const activeFinanceProject = useMemo(() => {
    if (!detailProject) return null;
    return sorted.find(p => p.id === detailProject.id) ?? detailProject;
  }, [detailProject, sorted]);

  const onSave = useCallback(
    async (p: Project) => {
      const draft = draftById[p.id];
      if (!draft) return;
      const ca = draft.contract_amount;
      if (ca != null && ca < 0) {
        showAppAlert(t('common.error'), t('finance.amountInvalid'), 'error');
        return;
      }
      setSavingId(p.id);
      try {
        const { error, data } = await updateProjectFinanceFields(p.id, draft);
        if (error) {
          showAppAlert(t('common.error'), (error as { message?: string }).message ?? String(error), 'error');
          return;
        }
        if (data) {
          const row = data as Project;
          patchAmountTexts(p.id, financeAmountTextsFromProject(row));
          setDraftById(prev => ({
            ...prev,
            [p.id]: {
              contract_amount: row.contract_amount ?? null,
              payment_terms: row.payment_terms ?? '',
              cost_labor: row.cost_labor ?? null,
              cost_rent: row.cost_rent ?? null,
              cost_materials: row.cost_materials ?? null,
            },
          }));
        }
        showAppAlert(t('common.success'), t('finance.saveSuccess'), 'success');
        await fetchProjects();
        await loadExpenseSums();
        setDetailProject(null);
      } finally {
        setSavingId(null);
      }
    },
    [draftById, fetchProjects, loadExpenseSums, patchAmountTexts, t, updateProjectFinanceFields]
  );

  const modalShellStyle = IS_WEB
    ? {
        justifyContent: 'center' as const,
        paddingHorizontal: 24,
        paddingVertical: 32,
      }
    : { justifyContent: 'flex-end' as const };

  const modalCardStyle = IS_WEB
    ? {
        borderRadius: 24,
        maxHeight: '92%' as const,
        maxWidth: 560,
        width: '100%' as const,
        alignSelf: 'center' as const,
      }
    : { maxHeight: '92%' as const };

  const inputCls =
    'border border-gray-200 rounded-xl px-3 py-2 text-gray-900 bg-white text-base';
  const labelCls = 'text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1';

  const renderFinanceForm = (p: Project) => {
    const draft = draftById[p.id];
    const amt = amountTextsById[p.id];
    const expSum = validatedSumByProject[p.id] ?? 0;
    const margin = computeNetMargin({
      contractAmount: draft?.contract_amount ?? p.contract_amount,
      costLabor: draft?.cost_labor ?? p.cost_labor,
      costRent: draft?.cost_rent ?? p.cost_rent,
      costMaterials: draft?.cost_materials ?? p.cost_materials,
      validatedExpensesTtcSum: expSum,
    });

    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator
      >
        <Text className="text-lg font-bold text-gray-900 mb-1">{p.name}</Text>
        <Text className="text-sm text-gray-500 mb-4">
          {t(`crm.statuses.${p.status}`)} · {formatMoney(draft?.contract_amount ?? p.contract_amount)}
        </Text>

        <View>
          <Text className={labelCls}>{t('finance.contractAmount')}</Text>
          <TextInput
            className={inputCls}
            keyboardType="decimal-pad"
            placeholder="0"
            value={amt?.contract_amount ?? ''}
            onChangeText={text => {
              const formatted = formatAmountThousandsSpaces(text);
              patchAmountTexts(p.id, { contract_amount: formatted });
              updateDraft(p.id, { contract_amount: parseLocaleAmount(formatted) });
            }}
          />
        </View>
        <View className="mt-3">
          <Text className={labelCls}>{t('finance.paymentTerms')}</Text>
          <TextInput
            className={`${inputCls} min-h-[72px]`}
            multiline
            textAlignVertical="top"
            placeholder={t('finance.paymentTermsPlaceholder')}
            value={draft?.payment_terms ?? ''}
            onChangeText={text => updateDraft(p.id, { payment_terms: text })}
          />
        </View>
        <Text className="text-xs text-gray-400 mt-2 mb-1">{t('finance.fixedCostsHint')}</Text>
        <View className="flex-row gap-2 mt-1">
          <View className="flex-1">
            <Text className={labelCls}>{t('finance.costLabor')}</Text>
            <TextInput
              className={inputCls}
              keyboardType="decimal-pad"
              value={amt?.cost_labor ?? ''}
              onChangeText={text => {
                const formatted = formatAmountThousandsSpaces(text);
                patchAmountTexts(p.id, { cost_labor: formatted });
                updateDraft(p.id, { cost_labor: parseLocaleAmount(formatted) });
              }}
            />
          </View>
          <View className="flex-1">
            <Text className={labelCls}>{t('finance.costRent')}</Text>
            <TextInput
              className={inputCls}
              keyboardType="decimal-pad"
              value={amt?.cost_rent ?? ''}
              onChangeText={text => {
                const formatted = formatAmountThousandsSpaces(text);
                patchAmountTexts(p.id, { cost_rent: formatted });
                updateDraft(p.id, { cost_rent: parseLocaleAmount(formatted) });
              }}
            />
          </View>
        </View>
        <View className="mt-3">
          <Text className={labelCls}>{t('finance.costMaterials')}</Text>
          <TextInput
            className={inputCls}
            keyboardType="decimal-pad"
            value={amt?.cost_materials ?? ''}
            onChangeText={text => {
              const formatted = formatAmountThousandsSpaces(text);
              patchAmountTexts(p.id, { cost_materials: formatted });
              updateDraft(p.id, { cost_materials: parseLocaleAmount(formatted) });
            }}
          />
        </View>
        <Pressable
          onPress={() => void openValidatedExpenseDetail(p)}
          accessibilityRole="button"
          accessibilityLabel={`${t('finance.validatedExpensesSum')}. ${t('finance.validatedExpensesTapForDetail')}`}
          className="bg-gray-50 rounded-xl p-3 mt-4 border border-gray-100 active:opacity-80"
        >
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1 min-w-0">
              <Text className="text-xs text-gray-500">{t('finance.validatedExpensesSum')}</Text>
              <Text className="text-base font-semibold text-gray-900 mt-0.5">{formatMoney(expSum)}</Text>
              <Text className="text-xs text-gray-400 mt-2">{t('finance.approvedMeansValidated')}</Text>
              <Text className="text-xs text-primary-600 font-medium mt-1.5">{t('finance.validatedExpensesTapForDetail')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.brandPrimary} style={{ marginTop: 2 }} />
          </View>
        </Pressable>
        <View className="mt-3">
          <Text className="text-xs text-gray-500 font-semibold uppercase">{t('finance.netMargin')}</Text>
          <Text
            className={`text-lg font-bold mt-0.5 ${
              margin != null && margin < 0 ? 'text-red-600' : 'text-primary-700'
            }`}
          >
            {margin != null ? formatMoney(margin) : '—'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => void onSave(p)}
          disabled={savingId === p.id}
          className="bg-primary-600 rounded-xl py-3.5 items-center mt-5"
        >
          {savingId === p.id ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  /** Affiché dans le même Modal que la fiche (évite un 2e Modal, non fiable sur iOS / TestFlight). */
  const renderValidatedExpensePanel = () => (
    <View className="flex-1 min-h-[280px]" style={{ minHeight: 280 }}>
      {validatedListLoading ? (
        <View className="flex-1 py-14 items-center justify-center">
          <ActivityIndicator color={theme.brandPrimary} />
        </View>
      ) : validatedListRows.length === 0 ? (
        <Text className="text-gray-500 text-center py-12 px-6">{t('finance.validatedExpensesModalEmpty')}</Text>
      ) : (
        <FlatList
          data={validatedListRows}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => {
            const dateLine =
              item.receipt_date && /^\d{4}-\d{2}-\d{2}/.test(item.receipt_date)
                ? formatDate(item.receipt_date.slice(0, 10))
                : item.receipt_date
                  ? formatDate(item.receipt_date)
                  : '—';
            return (
              <View className="flex-row justify-between items-start gap-3 py-3 border-b border-gray-100">
                <View className="flex-1 min-w-0 pr-2">
                  <Text className="text-gray-900 font-medium" numberOfLines={2}>
                    {item.supplier}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    {t('expense.receiptDate')}: {dateLine}
                  </Text>
                </View>
                <Text className="text-gray-900 font-semibold shrink-0">{formatMoney(item.amount_ttc)}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );

  const renderListItem = ({ item: p }: { item: Project }) => {
    const draft = draftById[p.id];
    const expSum = validatedSumByProject[p.id] ?? 0;
    const margin = computeNetMargin({
      contractAmount: draft?.contract_amount ?? p.contract_amount,
      costLabor: draft?.cost_labor ?? p.cost_labor,
      costRent: draft?.cost_rent ?? p.cost_rent,
      costMaterials: draft?.cost_materials ?? p.cost_materials,
      validatedExpensesTtcSum: expSum,
    });

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setDetailProject(p)}
        className={`bg-white rounded-[22px] p-5 mb-3 border border-gray-100 shadow-sm ${cardX}`}
        accessibilityRole="button"
        accessibilityLabel={t('finance.openProjectFinance', { name: p.name })}
      >
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1 min-w-0">
            <Text className="font-bold text-gray-900 text-base" numberOfLines={2}>
              {p.name}
            </Text>
            <Text className="text-gray-600 text-xs mt-2">
              {t('crm.projectStage')}:{' '}
              <Text className="font-medium text-gray-800">{t(`crm.statuses.${p.status}`)}</Text>
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              {t('finance.contractAmountShort')}:{' '}
              <Text className="font-medium text-gray-800">
                {formatMoney(draft?.contract_amount ?? p.contract_amount)}
              </Text>
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              {t('finance.netMargin')}:{' '}
              <Text
                className={`font-semibold ${
                  margin != null && margin < 0 ? 'text-red-600' : 'text-primary-700'
                }`}
              >
                {margin != null ? formatMoney(margin) : '—'}
              </Text>
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.inkMuted} />
        </View>
      </TouchableOpacity>
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
            <View>
              <AppNameText className="text-ink-300 text-[10px] uppercase tracking-[0.16em]">
                {t('common.appName')}
              </AppNameText>
              <ScreenHeroTitle className="mt-1">{t('finance.title')}</ScreenHeroTitle>
              <Text className="text-gray-500 text-xs mt-1" style={{ maxWidth: 560 }}>
                {t('finance.subtitle')}
              </Text>
              {projects.length > 0 ? (
                <Text className="text-gray-500 text-xs mt-1" style={{ maxWidth: 560 }}>
                  {t('finance.listSummary', { count: projects.length })}
                </Text>
              ) : null}
            </View>
          ) : (
            <>
              <AppNameText className="text-ink-300 text-xs uppercase tracking-[0.14em]">
                {t('common.appName')}
              </AppNameText>
              <ScreenHeroTitle className="mt-2">{t('finance.title')}</ScreenHeroTitle>
              <Text className="text-gray-400 text-sm mt-2">{t('finance.subtitle')}</Text>
              {projects.length > 0 ? (
                <Text className="text-gray-400 text-xs mt-2">{t('finance.listSummary', { count: projects.length })}</Text>
              ) : null}
            </>
          )}
        </View>
      </View>

      {loading && !projects.length ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          renderItem={renderListItem}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View className={`${cardX} mt-8`}>
              <Text className="text-gray-500 text-center">{t('finance.empty')}</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brandPrimary} />
          }
        />
      )}

      <Modal
        visible={!!detailProject && !!activeFinanceProject}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (validatedListModalOpen) setValidatedListModalOpen(false);
          else if (!savingId) setDetailProject(null);
        }}
      >
        <View className="flex-1" style={modalShellStyle}>
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={() => {
              if (validatedListModalOpen) setValidatedListModalOpen(false);
              else if (!savingId) setDetailProject(null);
            }}
            disabled={!!savingId}
            style={Platform.OS === 'web' && savingId ? { pointerEvents: 'none' as const } : undefined}
          />
          <View
            className="bg-white rounded-t-[28px] border border-gray-100 overflow-hidden flex-1"
            style={[modalCardStyle, { minHeight: 0 }]}
          >
            <View className="flex-row items-center border-b border-gray-100 px-3 py-3">
              <TouchableOpacity
                onPress={() => {
                  if (validatedListModalOpen) setValidatedListModalOpen(false);
                  else if (!savingId) setDetailProject(null);
                }}
                disabled={!!savingId}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={
                  validatedListModalOpen ? t('common.back') : t('finance.backToList')
                }
              >
                <Ionicons name="chevron-back" size={26} color={theme.brandInk} />
              </TouchableOpacity>
              <View className="flex-1 px-2 min-w-0">
                <Text
                  className="text-center text-base font-bold text-gray-900"
                  numberOfLines={validatedListModalOpen ? 2 : 1}
                >
                  {validatedListModalOpen
                    ? t('finance.validatedExpensesModalTitle')
                    : t('finance.detailModalTitle')}
                </Text>
                {validatedListModalOpen && validatedListProject ? (
                  <Text className="text-center text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                    {validatedListProject.name}
                  </Text>
                ) : null}
              </View>
              {validatedListModalOpen ? (
                <TouchableOpacity
                  onPress={() => setValidatedListModalOpen(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Ionicons name="close" size={26} color={theme.brandInk} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 26 }} />
              )}
            </View>
            {validatedListModalOpen && validatedListProject ? (
              renderValidatedExpensePanel()
            ) : activeFinanceProject ? (
              renderFinanceForm(activeFinanceProject)
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};
