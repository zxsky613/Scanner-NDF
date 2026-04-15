import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Profile,
  Project,
  ProjectCategory,
  ProjectStatus,
  PROJECT_CATEGORY_KEYS,
  PROJECT_STATUS_KEYS,
} from '../../types';
import { useProjects, type NewProjectInput } from '../../hooks/useProjects';
import { canManageProject } from '../../lib/roles';
import { projectStatusRequiresContractAmount, salesShouldPromptContractAmount } from '../../lib/projectFinance';
import { showAppAlert, showAppConfirm } from '../../utils/alert';
import { theme, headerPaddingTop, heroHeaderShadow } from '../../config/theme';
import { ScreenHeroTitle } from '../../components/ScreenHeroTitle';
import {
  IS_WEB,
  WEB_PAGE_GUTTER_CLASS,
  WEB_HERO_CARD_CLASS,
  WEB_CARD_GUTTER_CLASS,
  webHeroCardInlineStyle,
  webHeaderOuterInlineStyle,
} from '../../config/webLayout';
import { AppNameText } from '../../components/AppNameText';
import { formatDate } from '../../utils/dateFormat';
import { buildPeriodMarkings } from '../../utils/calendarRange';
import { syncCalendarLocale } from '../../utils/calendarLocales';
import {
  formatAmountThousandsFromNumber,
  formatAmountThousandsSpaces,
  parseLocaleAmount,
} from '../../utils/formatAmountInput';

type CrmProjectSort = 'created_desc' | 'owner_asc' | 'status_pipeline';

/** Flux Sales : popup uniquement pour changement de statut depuis la liste (pas depuis le formulaire). */
type SalesContractFlowState = { kind: 'status'; project: Project; newStatus: ProjectStatus };

const SWIPE_ACTION_W = 56;
const SWIPE_ICON_SIZE = 24;

/** Même style que l’onglet « Mes notes » : fond blanc, icônes outline. */
const projectSwipeStyles = {
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

interface Props {
  navigation: NativeStackNavigationProp<any>;
  profile: Profile;
}

export const CrmProjectsScreen: React.FC<Props> = ({ profile }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const insets = useSafeAreaInsets();
  const pageX = IS_WEB ? WEB_PAGE_GUTTER_CLASS : 'px-5';
  const cardX = IS_WEB ? WEB_CARD_GUTTER_CLASS : 'mx-5';
  const {
    projects,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    updateProjectStatus,
    updateProjectStatusAndContractAmount,
    deleteProject,
  } = useProjects();

  const [refreshing, setRefreshing] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusModalProject, setStatusModalProject] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [salesContractFlow, setSalesContractFlow] = useState<SalesContractFlowState | null>(null);
  const [salesContractAmountDraft, setSalesContractAmountDraft] = useState('');
  const [salesContractSaving, setSalesContractSaving] = useState(false);
  const [salesContractFieldError, setSalesContractFieldError] = useState('');

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProjectCategory>('sorting_equipment');
  const [formStatus, setFormStatus] = useState<ProjectStatus>('lead');
  const [formScale, setFormScale] = useState('');
  const [formCycle, setFormCycle] = useState('');
  const [formContact, setFormContact] = useState('');
  /** Montant devis / contrat (€), affiché si statut ≥ Devis. */
  const [formContractAmount, setFormContractAmount] = useState('');
  /** Erreur affichée dans la modale (les alertes globales passent souvent derrière une Modal sur le web). */
  const [createFormError, setCreateFormError] = useState('');
  const [sortMode, setSortMode] = useState<CrmProjectSort>('created_desc');
  const [sortDraft, setSortDraft] = useState<CrmProjectSort>('created_desc');
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCreatorId, setFilterCreatorId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<'all' | ProjectStatus>('all');
  const [filterDraftDateFrom, setFilterDraftDateFrom] = useState('');
  const [filterDraftDateTo, setFilterDraftDateTo] = useState('');
  const [filterDraftCreatorId, setFilterDraftCreatorId] = useState<string | null>(null);
  const [filterDraftStage, setFilterDraftStage] = useState<'all' | ProjectStatus>('all');
  const [crmFilterSheetView, setCrmFilterSheetView] = useState<'main' | 'dateRange'>('main');
  const [crmDatePick, setCrmDatePick] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [creatorPickerOpen, setCreatorPickerOpen] = useState(false);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const createScrollRef = useRef<ScrollView>(null);
  const projectSwipeRefs = useRef<Map<string, Swipeable>>(new Map());

  const sortOptions: { mode: CrmProjectSort; label: 'sortCreated' | 'sortOwner' | 'sortStatus' }[] = [
    { mode: 'created_desc', label: 'sortCreated' },
    { mode: 'owner_asc', label: 'sortOwner' },
    { mode: 'status_pipeline', label: 'sortStatus' },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProjects();
    } finally {
      setRefreshing(false);
    }
  }, [fetchProjects]);

  useFocusEffect(
    useCallback(() => {
      void fetchProjects();
    }, [fetchProjects])
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!IS_WEB) {
          projectSwipeRefs.current.forEach(s => s.close());
        }
      };
    }, [])
  );

  useEffect(() => {
    syncCalendarLocale(i18nInstance.language);
  }, [i18nInstance.language]);

  const filtersActive = useMemo(
    () => !!(filterDateFrom || filterCreatorId || filterStage !== 'all'),
    [filterDateFrom, filterCreatorId, filterStage]
  );

  const crmRangeMarked = useMemo(
    () => buildPeriodMarkings(crmDatePick.start, crmDatePick.end, theme.brandPrimary),
    [crmDatePick.start, crmDatePick.end]
  );

  const onCrmRangeDayPress = useCallback((day: DateData) => {
    const d = day.dateString;
    setCrmDatePick(prev => {
      if (!prev.start || (prev.start && prev.end)) {
        return { start: d, end: null };
      }
      if (d < prev.start) {
        return { start: d, end: prev.start };
      }
      return { start: prev.start, end: d };
    });
  }, []);

  const confirmCrmDateRange = useCallback(() => {
    const { start, end } = crmDatePick;
    if (!start) {
      setFilterDraftDateFrom('');
      setFilterDraftDateTo('');
    } else if (!end) {
      setFilterDraftDateFrom(start);
      setFilterDraftDateTo(start);
    } else {
      setFilterDraftDateFrom(start);
      setFilterDraftDateTo(end);
    }
    setCrmFilterSheetView('main');
  }, [crmDatePick]);

  const openCrmDateRangeInSheet = useCallback(() => {
    setCreatorPickerOpen(false);
    setStagePickerOpen(false);
    if (filterDraftDateFrom) {
      setCrmDatePick({
        start: filterDraftDateFrom,
        end:
          filterDraftDateTo && filterDraftDateTo !== filterDraftDateFrom
            ? filterDraftDateTo
            : null,
      });
    } else {
      setCrmDatePick({ start: null, end: null });
    }
    setCrmFilterSheetView('dateRange');
  }, [filterDraftDateFrom, filterDraftDateTo]);

  const filterDraftDateSummary =
    filterDraftDateFrom &&
    (filterDraftDateTo && filterDraftDateTo !== filterDraftDateFrom
      ? `${formatDate(filterDraftDateFrom)} – ${formatDate(filterDraftDateTo)}`
      : formatDate(filterDraftDateFrom));

  const resetForm = () => {
    setFormName('');
    setFormCategory('sorting_equipment');
    setFormStatus('lead');
    setFormScale('');
    setFormCycle('');
    setFormContact('');
    setFormContractAmount('');
    setCreateFormError('');
  };

  const closeProjectForm = () => {
    setProjectFormOpen(false);
    setEditingProjectId(null);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setEditingProjectId(null);
    setProjectFormOpen(true);
  };

  const openEdit = (p: Project) => {
    setFormName(p.name);
    setFormCategory(p.category);
    setFormStatus(p.status);
    setFormScale(p.scale ?? '');
    setFormCycle(p.cycle ?? '');
    setFormContact(p.client_contact ?? '');
    setFormContractAmount(
      p.contract_amount != null && !Number.isNaN(Number(p.contract_amount))
        ? formatAmountThousandsFromNumber(Number(p.contract_amount))
        : ''
    );
    setCreateFormError('');
    setEditingProjectId(p.id);
    setProjectFormOpen(true);
  };

  function formatCreateError(err: unknown): string {
    if (err && typeof err === 'object') {
      const o = err as Record<string, unknown>;
      const bits = ['message', 'details', 'hint']
        .map(k => (typeof o[k] === 'string' ? (o[k] as string).trim() : ''))
        .filter(Boolean);
      if (bits.length) return bits.join('\n\n');
    }
    if (err instanceof Error && err.message.trim()) return err.message;
    return String(err ?? '');
  }

  /** Popup toujours visible (au-dessus de la modale création grâce au z-index de AppAlertModalHost). */
  const popup = (title: string, message: string, variant: 'default' | 'success' | 'error' = 'default') => {
    requestAnimationFrame(() => {
      showAppAlert(title, message, variant);
    });
  };

  const runProjectSave = async (
    input: NewProjectInput,
    editingId: string | null,
    contractAmount?: number | null
  ) => {
    const payload: NewProjectInput =
      contractAmount !== undefined ? { ...input, contract_amount: contractAmount } : input;
    if (editingId) {
      const { error, data } = await updateProject(editingId, payload);
      if (error || !data) {
        const msg = error ? formatCreateError(error) : t('crm.updateNoRow');
        setCreateFormError(msg);
        popup(t('common.error'), msg, 'error');
        return;
      }
      closeProjectForm();
      setTimeout(() => {
        showAppAlert(t('common.success'), t('crm.editSuccess'), 'success');
      }, 200);
      return;
    }
    const { error, data } = await createProject(profile.id, payload);
    if (error || !data) {
      const msg = error ? formatCreateError(error) : t('crm.createNoRow');
      setCreateFormError(msg);
      popup(t('common.error'), msg, 'error');
      return;
    }
    closeProjectForm();
    setTimeout(() => {
      showAppAlert(t('common.success'), t('crm.createSuccess'), 'success');
    }, 200);
  };

  const submitProjectForm = async () => {
    setCreateFormError('');
    const name = formName.trim();
    if (!name) {
      setCreateFormError(t('crm.nameRequired'));
      createScrollRef.current?.scrollTo({ y: 0, animated: true });
      popup(t('common.error'), t('crm.nameRequired'), 'error');
      return;
    }
    const input: NewProjectInput = {
      name,
      category: formCategory,
      status: formStatus,
      scale: formScale.trim(),
      cycle: formCycle.trim(),
      client_contact: formContact.trim(),
    };

    let contractAmountForSave: number | undefined;
    if (projectStatusRequiresContractAmount(formStatus)) {
      const parsed = parseLocaleAmount(formContractAmount);
      if (parsed == null || parsed < 0) {
        const msg = t('crm.contractAmountInvalid');
        setCreateFormError(msg);
        createScrollRef.current?.scrollTo({ y: 0, animated: true });
        popup(t('common.error'), msg, 'error');
        return;
      }
      contractAmountForSave = parsed;
    }

    setSaving(true);
    try {
      await runProjectSave(
        input,
        editingProjectId,
        contractAmountForSave !== undefined ? contractAmountForSave : undefined
      );
    } catch (e) {
      const msg = formatCreateError(e);
      setCreateFormError(msg);
      popup(t('common.error'), msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmSalesContractAmount = async () => {
    setSalesContractFieldError('');
    const amount = parseLocaleAmount(salesContractAmountDraft);
    if (amount == null || amount < 0) {
      setSalesContractFieldError(t('crm.contractAmountInvalid'));
      return;
    }
    if (!salesContractFlow) return;
    setSalesContractSaving(true);
    try {
      const { project, newStatus } = salesContractFlow;
      const { error } = await updateProjectStatusAndContractAmount(project.id, newStatus, amount);
      if (error) {
        showAppAlert(t('common.error'), error.message ?? String(error), 'error');
        return;
      }
      setSalesContractFlow(null);
      showAppAlert(t('common.success'), t('crm.contractAmountSaved'), 'success');
    } finally {
      setSalesContractSaving(false);
    }
  };

  const onPickStatus = async (p: Project, status: ProjectStatus) => {
    setStatusModalProject(null);
    if (
      salesShouldPromptContractAmount({
        role: profile.role,
        prevStatus: p.status,
        nextStatus: status,
        currentContractAmount: p.contract_amount,
      })
    ) {
      setSalesContractFieldError('');
      setSalesContractFlow({ kind: 'status', project: p, newStatus: status });
      setSalesContractAmountDraft(
        p.contract_amount != null
          ? formatAmountThousandsFromNumber(Number(p.contract_amount))
          : ''
      );
      return;
    }
    const { error } = await updateProjectStatus(p.id, status);
    if (error) {
      showAppAlert(t('common.error'), error.message ?? String(error), 'error');
    }
  };

  const onDelete = async (p: Project) => {
    const ok = await showAppConfirm(
      t('crm.deleteTitle'),
      t('crm.deleteMessage', { name: p.name }),
      t('common.cancel'),
      t('common.delete')
    );
    if (!ok) return;
    const { error } = await deleteProject(p.id);
    if (error) {
      showAppAlert(t('common.error'), error.message ?? String(error), 'error');
    }
  };

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
        maxHeight: '88%' as const,
        maxWidth: 520,
        width: '100%' as const,
        alignSelf: 'center' as const,
        borderTopWidth: 0,
        borderWidth: 1,
        borderColor: 'rgba(36, 41, 73, 0.08)',
        zIndex: 10,
        position: 'relative' as const,
      }
    : { zIndex: 10, position: 'relative' as const };

  const projectLeadLabel = (p: Project) => {
    const c = p.creator;
    if (c?.full_name?.trim()) return c.full_name.trim();
    if (c?.email?.trim()) return c.email.trim();
    return null;
  };

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      const id = p.created_by;
      if (!id || map.has(id)) continue;
      const c = p.creator;
      const label =
        (c?.full_name?.trim() && c.full_name.trim()) ||
        (c?.email?.trim() && c.email.trim()) ||
        id;
      map.set(id, label);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (filterDateFrom) {
      const from = filterDateFrom;
      const to = filterDateTo || filterDateFrom;
      const fromTs = new Date(`${from}T00:00:00`).getTime();
      const toTs = new Date(`${to}T23:59:59.999`).getTime();
      list = list.filter(p => {
        const ts = new Date(p.created_at).getTime();
        return ts >= fromTs && ts <= toTs;
      });
    }
    if (filterCreatorId) {
      list = list.filter(p => p.created_by === filterCreatorId);
    }
    if (filterStage !== 'all') {
      list = list.filter(p => p.status === filterStage);
    }
    return list;
  }, [projects, filterDateFrom, filterDateTo, filterCreatorId, filterStage]);

  const displayedProjects = useMemo(() => {
    const list = [...filteredProjects];
    const statusOrder = (s: ProjectStatus) => PROJECT_STATUS_KEYS.indexOf(s);
    const ownerSortKey = (p: Project) => {
      const label = projectLeadLabel(p);
      return label ? label.toLocaleLowerCase() : '\uffff';
    };
    if (sortMode === 'created_desc') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortMode === 'owner_asc') {
      list.sort((a, b) => ownerSortKey(a).localeCompare(ownerSortKey(b)));
    } else {
      list.sort((a, b) => {
        const da = statusOrder(a.status);
        const db = statusOrder(b.status);
        if (da !== db) return da - db;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return list;
  }, [filteredProjects, sortMode]);

  const closeProjectSwipe = (id: string) => {
    projectSwipeRefs.current.get(id)?.close();
  };

  const registerProjectSwipeRef = (id: string) => (ref: Swipeable | null) => {
    if (ref) projectSwipeRefs.current.set(id, ref);
    else projectSwipeRefs.current.delete(id);
  };

  const renderProject = ({ item }: { item: Project }) => {
    const canManage = canManageProject(profile.role, profile.id, item.created_by);

    const webActionIcons = (
      <View className="flex-row items-start gap-2 shrink-0 pt-0.5">
        <TouchableOpacity
          onPress={() => setDetailProject(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('crm.viewDetail')}
        >
          <Ionicons name="eye-outline" size={22} color={theme.brandInk} />
        </TouchableOpacity>
        {canManage ? (
          <>
            <TouchableOpacity
              onPress={() => openEdit(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.edit')}
            >
              <Ionicons name="pencil-outline" size={22} color={theme.brandInk} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void onDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );

    const statusBlock = canManage ? (
      <TouchableOpacity
        className="mt-3 flex-row items-center justify-between bg-surface border border-gray-100 rounded-xl px-3 py-2.5"
        onPress={() => setStatusModalProject(item)}
      >
        <Text className="text-gray-700 text-sm font-medium">{t('crm.changeStatus')}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-primary-700 text-sm font-semibold">
            {t(`crm.statuses.${item.status}`)}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.brandInk} />
        </View>
      </TouchableOpacity>
    ) : (
      <View className="mt-3 flex-row items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
        <Text className="text-gray-500 text-sm">{t('crm.status')}</Text>
        <Text className="text-gray-800 text-sm font-semibold">{t(`crm.statuses.${item.status}`)}</Text>
      </View>
    );

    const cardBody = (
      <>
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1 min-w-0">
            <Text className="font-bold text-gray-900 text-base" numberOfLines={2}>
              {item.name}
            </Text>
            <Text className="text-gray-600 text-xs mt-2">
              {t('crm.createdBy')}:{' '}
              <Text className="font-medium text-gray-800">
                {projectLeadLabel(item) ?? t('crm.createdByUnknown')}
              </Text>
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              {t('crm.createdAt')}:{' '}
              <Text className="font-medium text-gray-700">{formatDate(item.created_at)}</Text>
            </Text>
            <Text className="text-gray-600 text-xs mt-1">
              {t('crm.projectStage')}:{' '}
              <Text className="font-medium text-gray-800">{t(`crm.statuses.${item.status}`)}</Text>
            </Text>
          </View>
          {IS_WEB ? webActionIcons : null}
        </View>
        {statusBlock}
      </>
    );

    if (IS_WEB) {
      return (
        <View
          className={`bg-white rounded-[22px] p-5 mb-3 border border-gray-100/80 shadow-sm ${cardX}`}
        >
          {cardBody}
        </View>
      );
    }

    const rightActions = (
      <View
        className="flex-row rounded-r-[22px] border border-gray-100 bg-white overflow-hidden"
        style={{ alignSelf: 'stretch' }}
      >
        <Pressable
          style={projectSwipeStyles.cell}
          android_ripple={{ color: '#f1f5f9' }}
          onPress={() => {
            closeProjectSwipe(item.id);
            setDetailProject(item);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('crm.viewDetail')}
        >
          <Ionicons name="eye-outline" size={SWIPE_ICON_SIZE} color={projectSwipeStyles.iconView} />
        </Pressable>
        {canManage ? (
          <>
            <View className="w-px bg-gray-100 self-stretch" />
            <Pressable
              style={projectSwipeStyles.cell}
              android_ripple={{ color: '#f1f5f9' }}
              onPress={() => {
                closeProjectSwipe(item.id);
                openEdit(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.edit')}
            >
              <Ionicons name="create-outline" size={SWIPE_ICON_SIZE} color={projectSwipeStyles.iconEdit} />
            </Pressable>
            <View className="w-px bg-gray-100 self-stretch" />
            <Pressable
              style={projectSwipeStyles.cell}
              android_ripple={{ color: '#fef2f2' }}
              onPress={() => {
                closeProjectSwipe(item.id);
                void onDelete(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <Ionicons name="trash-outline" size={SWIPE_ICON_SIZE} color={projectSwipeStyles.iconDelete} />
            </Pressable>
          </>
        ) : null}
      </View>
    );

    return (
      <View className={`mb-3 ${cardX}`}>
        <Swipeable
          ref={registerProjectSwipeRef(item.id)}
          friction={2}
          overshootRight={false}
          renderRightActions={() => rightActions}
        >
          <View className="bg-white rounded-[22px] p-5 border border-gray-100/80 shadow-sm overflow-hidden">
            {cardBody}
          </View>
        </Swipeable>
      </View>
    );
  };

  const openSortModal = () => {
    setSortDraft(sortMode);
    setFilterDraftDateFrom(filterDateFrom);
    setFilterDraftDateTo(filterDateTo);
    setFilterDraftCreatorId(filterCreatorId);
    setFilterDraftStage(filterStage);
    setCrmFilterSheetView('main');
    setCreatorPickerOpen(false);
    setStagePickerOpen(false);
    setSortModalOpen(true);
  };

  const closeSortModal = () => {
    setSortModalOpen(false);
    setCrmFilterSheetView('main');
    setCreatorPickerOpen(false);
    setStagePickerOpen(false);
  };

  const applySortModal = () => {
    setSortMode(sortDraft);
    setFilterDateFrom(filterDraftDateFrom);
    setFilterDateTo(filterDraftDateTo);
    setFilterCreatorId(filterDraftCreatorId);
    setFilterStage(filterDraftStage);
    setCrmFilterSheetView('main');
    setCreatorPickerOpen(false);
    setStagePickerOpen(false);
    setSortModalOpen(false);
  };

  const sortPillButton = (
    <TouchableOpacity
      className="flex-row items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2.5 active:opacity-90"
      onPress={openSortModal}
      accessibilityRole="button"
      accessibilityLabel={t('crm.sortButton')}
    >
      <Ionicons
        name="filter-outline"
        size={20}
        color={filtersActive ? theme.brandPrimary : theme.brandInk}
      />
      <Text
        className={`font-semibold text-sm ${filtersActive ? 'text-primary-600' : 'text-ink'}`}
      >
        {t('crm.sortButton')}
      </Text>
    </TouchableOpacity>
  );

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
              <View className="flex-row items-center justify-between gap-3 mt-1 flex-wrap">
                <View className="flex-1 min-w-[200px] pr-2">
                  <ScreenHeroTitle>{t('navTabs.crm')}</ScreenHeroTitle>
                </View>
                <View className="flex-row items-center gap-2 flex-wrap shrink-0">
                  {sortPillButton}
                  <TouchableOpacity
                    className="flex-row items-center gap-2 bg-primary-600 rounded-lg px-4 py-2.5"
                    onPress={openCreate}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text className="text-white font-bold text-sm">{t('crm.newProject')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-gray-500 text-xs mt-1">{t('crm.subtitle')}</Text>
            </View>
          ) : (
            <>
              <AppNameText className="text-ink-300 text-xs uppercase tracking-[0.14em]">
                {t('common.appName')}
              </AppNameText>
              <ScreenHeroTitle className="mt-2">{t('navTabs.crm')}</ScreenHeroTitle>
              <Text className="text-gray-400 text-sm mt-2">{t('crm.subtitle')}</Text>
              <View className="flex-row items-center gap-2 mt-4 flex-wrap">
                {sortPillButton}
                <TouchableOpacity
                  className="flex-row items-center gap-2 bg-primary-600 rounded-full px-5 py-3"
                  onPress={openCreate}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text className="text-white font-bold text-sm">{t('crm.newProject')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {loading && projects.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.brandPrimary} size="large" />
        </View>
      ) : (
        <FlatList
          data={displayedProjects}
          keyExtractor={p => p.id}
          extraData={{ sortMode, filtersActive, filterDateFrom, filterCreatorId, filterStage }}
          renderItem={renderProject}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: IS_WEB ? 40 : Math.max(insets.bottom, 24) + 80,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          ListEmptyComponent={
            <View className={`${cardX} mt-6 bg-white rounded-[22px] border border-gray-100 px-6 py-12 items-center`}>
              <Text className="text-gray-500 text-center">
                {projects.length === 0
                  ? t('crm.empty')
                  : filtersActive
                    ? t('crm.emptyFiltered')
                    : t('crm.empty')}
              </Text>
              {projects.length === 0 ? (
                <TouchableOpacity className="mt-4 bg-primary-600 rounded-full px-5 py-3" onPress={openCreate}>
                  <Text className="text-white font-bold text-sm">{t('crm.newProject')}</Text>
                </TouchableOpacity>
              ) : filtersActive ? (
                <TouchableOpacity
                  className="mt-4 border border-gray-200 rounded-full px-5 py-3 bg-surface"
                  onPress={openSortModal}
                >
                  <Text className="text-gray-800 font-semibold text-sm">{t('crm.adjustFilters')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}

      <Modal
        visible={sortModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeSortModal}
      >
        <View
          className="flex-1 justify-end"
          style={IS_WEB ? { justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 } : undefined}
        >
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={closeSortModal}
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
            {crmFilterSheetView === 'main' ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 }}
              >
                <Text className="text-xl font-bold text-gray-900 mb-2">{t('crm.sortModalTitle')}</Text>
                <Text className="text-gray-500 text-xs mb-6 leading-4">{t('crm.sortModalHint')}</Text>

                <Text className="text-gray-700 font-medium mb-2">{t('crm.sortSection')}</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {sortOptions.map(({ mode, label }) => (
                    <TouchableOpacity
                      key={mode}
                      className={`px-4 py-2 rounded-full border ${
                        sortDraft === mode
                          ? 'bg-primary-600 border-primary-600'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      onPress={() => setSortDraft(mode)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sortDraft === mode }}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          sortDraft === mode ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {t(`crm.${label}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-gray-700 font-medium mb-2">{t('crm.filterSection')}</Text>
                <Text className="text-gray-500 text-xs mb-3 leading-4">{t('crm.filterSectionHint')}</Text>

                <Text className="text-gray-700 font-medium mb-2">{t('admin.filterByDate')}</Text>
                <TouchableOpacity
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-2 active:opacity-80"
                  onPress={openCrmDateRangeInSheet}
                >
                  <Text
                    className={`text-sm font-medium ${
                      filterDraftDateSummary ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {filterDraftDateSummary || t('admin.dateRangePlaceholder')}
                  </Text>
                </TouchableOpacity>
                <Text className="text-gray-500 text-xs mb-4 leading-4">{t('admin.dateRangeHint')}</Text>

                <Text className="text-gray-700 font-medium mb-2">{t('crm.filterByCreator')}</Text>
                <View className="flex-row items-stretch gap-2 mb-4">
                  <TouchableOpacity
                    className={`px-4 py-3 rounded-xl border justify-center ${
                      filterDraftCreatorId === null
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onPress={() => setFilterDraftCreatorId(null)}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        filterDraftCreatorId === null ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {t('common.all')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 min-w-0 flex-row items-center justify-between px-4 py-3 rounded-xl border ${
                      filterDraftCreatorId
                        ? 'border-primary-300 bg-primary-50/50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    onPress={() => {
                      if (creatorOptions.length > 0) {
                        setStagePickerOpen(false);
                        setCreatorPickerOpen(true);
                      }
                    }}
                    disabled={creatorOptions.length === 0}
                    accessibilityRole="button"
                    accessibilityLabel={t('crm.selectCreatorPlaceholder')}
                  >
                    <Text
                      className={`text-sm font-medium flex-1 pr-2 ${
                        filterDraftCreatorId ? 'text-gray-900' : 'text-gray-400'
                      }`}
                      numberOfLines={1}
                    >
                      {filterDraftCreatorId
                        ? creatorOptions.find(c => c.id === filterDraftCreatorId)?.label ??
                          filterDraftCreatorId
                        : t('crm.selectCreatorPlaceholder')}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={theme.inkMuted} />
                  </TouchableOpacity>
                </View>

                <Text className="text-gray-700 font-medium mb-2">{t('crm.filterByStage')}</Text>
                <View className="flex-row items-stretch gap-2 mb-6">
                  <TouchableOpacity
                    className={`px-4 py-3 rounded-xl border justify-center ${
                      filterDraftStage === 'all'
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onPress={() => setFilterDraftStage('all')}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        filterDraftStage === 'all' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {t('common.all')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 min-w-0 flex-row items-center justify-between px-4 py-3 rounded-xl border ${
                      filterDraftStage !== 'all'
                        ? 'border-primary-300 bg-primary-50/50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    onPress={() => {
                      setCreatorPickerOpen(false);
                      setStagePickerOpen(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('crm.selectStagePlaceholder')}
                  >
                    <Text
                      className={`text-sm font-medium flex-1 pr-2 ${
                        filterDraftStage !== 'all' ? 'text-gray-900' : 'text-gray-400'
                      }`}
                      numberOfLines={1}
                    >
                      {filterDraftStage === 'all'
                        ? t('crm.selectStagePlaceholder')
                        : t(`crm.statuses.${filterDraftStage}`)}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={theme.inkMuted} />
                  </TouchableOpacity>
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 border border-gray-200 rounded-full py-3.5 items-center bg-surface"
                    onPress={closeSortModal}
                  >
                    <Text className="text-gray-800 font-semibold">{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-primary-600 rounded-full py-3.5 items-center"
                    onPress={applySortModal}
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
                      if (filterDraftDateFrom) {
                        setCrmDatePick({
                          start: filterDraftDateFrom,
                          end:
                            filterDraftDateTo && filterDraftDateTo !== filterDraftDateFrom
                              ? filterDraftDateTo
                              : null,
                        });
                      } else {
                        setCrmDatePick({ start: null, end: null });
                      }
                      setCrmFilterSheetView('main');
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
                    <Text className="text-gray-500 text-sm mb-4 leading-5">{t('admin.dateRangeHint')}</Text>
                    <Calendar
                      firstDay={1}
                      enableSwipeMonths
                      markingType="period"
                      markedDates={crmRangeMarked}
                      onDayPress={onCrmRangeDayPress}
                      current={crmDatePick.start || filterDraftDateFrom || undefined}
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
                    onPress={() => setCrmDatePick({ start: null, end: null })}
                  >
                    <Text className="text-gray-800 font-semibold text-sm">{t('admin.clearDateRange')}</Text>
                  </TouchableOpacity>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 border border-gray-200 rounded-full py-3.5 items-center bg-surface"
                      onPress={() => {
                        if (filterDraftDateFrom) {
                          setCrmDatePick({
                            start: filterDraftDateFrom,
                            end:
                              filterDraftDateTo && filterDraftDateTo !== filterDraftDateFrom
                                ? filterDraftDateTo
                                : null,
                          });
                        } else {
                          setCrmDatePick({ start: null, end: null });
                        }
                        setCrmFilterSheetView('main');
                      }}
                    >
                      <Text className="text-gray-800 font-semibold text-sm">{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-primary-600 rounded-full py-3.5 items-center"
                      onPress={confirmCrmDateRange}
                    >
                      <Text className="text-white font-bold text-sm">{t('common.confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
            {creatorPickerOpen && crmFilterSheetView === 'main' ? (
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
                  onPress={() => setCreatorPickerOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                />
                <View className="bg-white rounded-t-[24px] border-t border-gray-200 px-4 pt-4 pb-5 shadow-lg">
                  <Text className="text-ink font-bold text-base mb-1">{t('crm.filterByCreator')}</Text>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 280 }}
                    nestedScrollEnabled
                  >
                    {creatorOptions.length === 0 ? (
                      <Text className="text-gray-500 text-sm py-4">{t('crm.noCreatorsInList')}</Text>
                    ) : (
                      creatorOptions.map(c => (
                        <TouchableOpacity
                          key={c.id}
                          className="py-3.5 border-b border-gray-100 active:bg-gray-50"
                          onPress={() => {
                            setFilterDraftCreatorId(c.id);
                            setCreatorPickerOpen(false);
                          }}
                        >
                          <Text
                            className={`text-base ${
                              filterDraftCreatorId === c.id
                                ? 'font-bold'
                                : 'font-medium text-gray-900'
                            }`}
                            style={
                              filterDraftCreatorId === c.id ? { color: theme.brandPrimary } : undefined
                            }
                          >
                            {c.label}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            ) : null}
            {stagePickerOpen && crmFilterSheetView === 'main' ? (
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
                  onPress={() => setStagePickerOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                />
                <View className="bg-white rounded-t-[24px] border-t border-gray-200 px-4 pt-4 pb-5 shadow-lg">
                  <Text className="text-ink font-bold text-base mb-1">{t('crm.filterByStage')}</Text>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    style={{ maxHeight: 280 }}
                    nestedScrollEnabled
                  >
                    {PROJECT_STATUS_KEYS.map(st => (
                      <TouchableOpacity
                        key={st}
                        className="py-3.5 border-b border-gray-100 active:bg-gray-50"
                        onPress={() => {
                          setFilterDraftStage(st);
                          setStagePickerOpen(false);
                        }}
                      >
                        <Text
                          className={`text-base ${
                            filterDraftStage === st ? 'font-bold' : 'font-medium text-gray-900'
                          }`}
                          style={filterDraftStage === st ? { color: theme.brandPrimary } : undefined}
                        >
                          {t(`crm.statuses.${st}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Création projet : même Modal centrée (web) / bas (mobile) que les filtres Suivi */}
      <Modal
        visible={projectFormOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!saving) closeProjectForm();
        }}
      >
        <View className="flex-1" style={modalShellStyle}>
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={() => {
              if (!saving) closeProjectForm();
            }}
            disabled={saving}
            style={Platform.OS === 'web' && saving ? { pointerEvents: 'none' as const } : undefined}
          />
          <View className="bg-white rounded-t-[28px] border-t border-gray-100 max-h-[92%]" style={modalCardStyle}>
            <ScrollView
              ref={createScrollRef}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
            >
              <Text className="text-xl font-bold text-gray-900 mb-2">
                {editingProjectId ? t('crm.editTitle') : t('crm.createTitle')}
              </Text>
              <Text className="text-gray-500 text-xs mb-3 leading-4">{t('crm.nameFieldHint')}</Text>

              {createFormError ? (
                <View className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
                  <Text className="text-red-700 text-sm">{createFormError}</Text>
                </View>
              ) : null}

              <Text className="text-gray-700 font-medium mb-1">{t('crm.name')}</Text>
              <TextInput
                className={`bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 mb-4 border-2 ${
                  createFormError ? 'border-red-400' : 'border-gray-200'
                }`}
                value={formName}
                onChangeText={text => {
                  setFormName(text);
                  if (createFormError) setCreateFormError('');
                }}
                placeholder={t('crm.name')}
              />

              <Text className="text-gray-700 font-medium mb-2">{t('crm.category')}</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {PROJECT_CATEGORY_KEYS.map(c => (
                  <TouchableOpacity
                    key={c}
                    className={`px-3 py-2 rounded-full border ${
                      formCategory === c
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onPress={() => setFormCategory(c)}
                  >
                    <Text
                      className={`text-xs font-medium ${formCategory === c ? 'text-white' : 'text-gray-700'}`}
                      numberOfLines={2}
                    >
                      {t(`crm.categories.${c}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-gray-700 font-medium mb-2">{t('crm.status')}</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {PROJECT_STATUS_KEYS.map(s => (
                  <TouchableOpacity
                    key={s}
                    className={`px-3 py-2 rounded-full border ${
                      formStatus === s
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onPress={() => {
                      setFormStatus(s);
                      if (!projectStatusRequiresContractAmount(s)) {
                        setFormContractAmount('');
                      }
                    }}
                  >
                    <Text
                      className={`text-xs font-medium ${formStatus === s ? 'text-white' : 'text-gray-700'}`}
                    >
                      {t(`crm.statuses.${s}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {projectStatusRequiresContractAmount(formStatus) ? (
                <>
                  <Text className="text-gray-700 font-medium mb-1">{t('crm.contractAmountLabel')}</Text>
                  <Text className="text-gray-500 text-xs mb-2">{t('crm.contractAmountFormHint')}</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                    keyboardType="decimal-pad"
                    value={formContractAmount}
                    onChangeText={text => {
                      setFormContractAmount(formatAmountThousandsSpaces(text));
                      if (createFormError) setCreateFormError('');
                    }}
                    placeholder={t('crm.contractAmountPlaceholder')}
                  />
                </>
              ) : null}

              <Text className="text-gray-700 font-medium mb-1">{t('crm.scale')}</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                value={formScale}
                onChangeText={setFormScale}
                placeholder={t('crm.scale')}
              />

              <Text className="text-gray-700 font-medium mb-1">{t('crm.cycle')}</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                value={formCycle}
                onChangeText={setFormCycle}
                placeholder={t('crm.cycle')}
              />

              <Text className="text-gray-700 font-medium mb-1">{t('crm.clientContact')}</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-6"
                value={formContact}
                onChangeText={setFormContact}
                placeholder={t('crm.clientContact')}
              />

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 border border-gray-200 rounded-full py-3.5 items-center"
                  onPress={() => !saving && closeProjectForm()}
                  disabled={saving}
                >
                  <Text className="text-gray-800 font-semibold">{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 rounded-full py-3.5 items-center ${saving ? 'bg-primary-400' : 'bg-primary-600'}`}
                  onPress={() => void submitProjectForm()}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold">
                      {editingProjectId ? t('common.save') : t('common.confirm')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!detailProject}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailProject(null)}
      >
        <View className="flex-1" style={modalShellStyle}>
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setDetailProject(null)} />
          <View
            className="bg-white rounded-t-[24px] border border-gray-100 max-h-[85%]"
            style={modalCardStyle}
          >
            {detailProject ? (
              <>
                <View className="px-5 pt-5 pb-2 flex-row items-start justify-between gap-2">
                  <Text className="text-lg font-bold text-gray-900 flex-1 pr-2">{t('crm.detailTitle')}</Text>
                  <TouchableOpacity
                    onPress={() => setDetailProject(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                  >
                    <Ionicons name="close" size={26} color={theme.inkMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
                >
                  <Text className="text-xl font-bold text-gray-900 mb-4">{detailProject.name}</Text>

                  <View className="mb-3">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.category')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {t(`crm.categories.${detailProject.category}`)}
                    </Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.projectStage')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {t(`crm.statuses.${detailProject.status}`)}
                    </Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.createdBy')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {projectLeadLabel(detailProject) ?? t('crm.createdByUnknown')}
                    </Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.createdAt')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {formatDate(detailProject.created_at)}
                    </Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.updatedAt')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {formatDate(detailProject.updated_at)}
                    </Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.scale')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {detailProject.scale?.trim() ? detailProject.scale : '—'}
                    </Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.cycle')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {detailProject.cycle?.trim() ? detailProject.cycle : '—'}
                    </Text>
                  </View>
                  <View className="mb-1">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.clientContact')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {detailProject.client_contact?.trim() ? detailProject.client_contact : '—'}
                    </Text>
                  </View>
                  <View className="mb-1">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                      {t('crm.contractAmountLabel')}
                    </Text>
                    <Text className="text-gray-900 text-base mt-1">
                      {detailProject.contract_amount != null && !Number.isNaN(Number(detailProject.contract_amount))
                        ? `${Number(detailProject.contract_amount).toLocaleString(i18nInstance.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                        : '—'}
                    </Text>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!statusModalProject}
        animationType="fade"
        transparent
        onRequestClose={() => setStatusModalProject(null)}
      >
        <View className="flex-1" style={modalShellStyle}>
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setStatusModalProject(null)} />
          <View
            className="bg-white rounded-t-[24px] border border-gray-100 max-h-[70%]"
            style={modalCardStyle}
          >
            <Text className="text-lg font-bold text-gray-900 px-5 pt-5 pb-2">{t('crm.changeStatus')}</Text>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              {PROJECT_STATUS_KEYS.map(s => (
                <TouchableOpacity
                  key={s}
                  className="py-3.5 border-b border-gray-100"
                  onPress={() => statusModalProject && void onPickStatus(statusModalProject, s)}
                >
                  <Text
                    className={`text-base ${
                      statusModalProject?.status === s ? 'text-primary-700 font-bold' : 'text-gray-800'
                    }`}
                  >
                    {t(`crm.statuses.${s}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!salesContractFlow}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!salesContractSaving) setSalesContractFlow(null);
        }}
      >
        <View className="flex-1" style={modalShellStyle}>
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={() => {
              if (!salesContractSaving) setSalesContractFlow(null);
            }}
          />
          <View
            className="bg-white rounded-t-[24px] border border-gray-100"
            style={modalCardStyle}
          >
            <Text className="text-lg font-bold text-gray-900 px-5 pt-5 pb-1">
              {t('crm.contractAmountTitle')}
            </Text>
            <Text className="text-sm text-gray-500 px-5 pb-3">
              {salesContractFlow
                ? t('crm.contractAmountHintStatus', {
                    name: salesContractFlow.project.name,
                    status: t(`crm.statuses.${salesContractFlow.newStatus}`),
                  })
                : ''}
            </Text>
            <View className="px-5 pb-5">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {t('crm.contractAmountLabel')}
              </Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900 bg-white"
                keyboardType="decimal-pad"
                placeholder="0"
                editable={!salesContractSaving}
                value={salesContractAmountDraft}
                onChangeText={text => {
                  setSalesContractAmountDraft(formatAmountThousandsSpaces(text));
                  if (salesContractFieldError) setSalesContractFieldError('');
                }}
              />
              {salesContractFieldError ? (
                <Text className="text-red-600 text-sm mt-2">{salesContractFieldError}</Text>
              ) : null}
              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl border border-gray-200 items-center"
                  disabled={salesContractSaving}
                  onPress={() => {
                    if (!salesContractSaving) setSalesContractFlow(null);
                  }}
                >
                  <Text className="text-gray-800 font-semibold">{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl bg-primary-600 items-center"
                  disabled={salesContractSaving}
                  onPress={() => void confirmSalesContractAmount()}
                >
                  {salesContractSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">{t('common.confirm')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
