import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Expense, Profile } from '../../types';
import { supabase } from '../../config/supabase';
import { formatDate, formatCurrency } from '../../utils/dateFormat';
import { resolveReceiptImageUri } from '../../lib/receiptImageUrl';
import { theme, headerPaddingTop } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ ExpenseDetail: { expense: Expense } }, 'ExpenseDetail'>;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'expense.pending' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'expense.approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'expense.rejected' },
};

const THUMB = 72;

export const ExpenseDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [expenseRow, setExpenseRow] = useState<Expense>(route.params.expense);
  const status = statusConfig[expenseRow.status];
  const { width: windowW, height: windowH } = useWindowDimensions();

  useEffect(() => {
    setExpenseRow(route.params.expense);
  }, [route.params.expense.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const id = route.params.expense.id;
      (async () => {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (cancelled || error || !data) return;
        setExpenseRow(prev => ({
          ...(data as Expense),
          profiles: prev.profiles,
        }));
      })();
      return () => {
        cancelled = true;
      };
    }, [route.params.expense.id])
  );

  /** Miniature sur la carte (préchargement discret) */
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(false);

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [modalUri, setModalUri] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(false);

  useEffect(() => {
    if (!expenseRow.receipt_image_url) {
      setThumbUri(null);
      return;
    }
    let alive = true;
    setThumbLoading(true);
    resolveReceiptImageUri(expenseRow.receipt_image_url)
      .then(uri => {
        if (alive) setThumbUri(uri ?? null);
      })
      .finally(() => {
        if (alive) setThumbLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [expenseRow.id, expenseRow.receipt_image_url]);

  const loadImageForModal = useCallback(async () => {
    if (!expenseRow.receipt_image_url) return;
    setModalLoading(true);
    setModalError(false);
    setModalUri(null);
    try {
      const uri = await resolveReceiptImageUri(expenseRow.receipt_image_url);
      if (uri) {
        setModalUri(uri);
      } else {
        setModalError(true);
      }
    } catch {
      setModalError(true);
    } finally {
      setModalLoading(false);
    }
  }, [expenseRow.receipt_image_url]);

  const openReceiptModal = () => {
    if (!expenseRow.receipt_image_url) return;
    setReceiptModalVisible(true);
    void loadImageForModal();
  };

  const closeReceiptModal = () => {
    setReceiptModalVisible(false);
    setModalUri(null);
    setModalError(false);
  };

  const hasReceipt = !!expenseRow.receipt_image_url?.trim();

  const modalImageMaxH = Math.min(windowH * 0.72, 720);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
    >
      <View className="px-5 pb-2" style={{ paddingTop: headerPaddingTop(insets.top) }}>
        <View
          className="bg-white rounded-[28px] px-5 py-5 border border-gray-100/80 shadow-sm"
          style={{
            shadowColor: theme.brandPrimary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.06,
            shadowRadius: 20,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
              <Text className="text-primary-600 text-base font-bold">← {t('common.back')}</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-gray-900 text-2xl font-bold mt-3 leading-tight" numberOfLines={2}>
            {expenseRow.supplier}
          </Text>
          <View className={`self-start px-3 py-1.5 rounded-full mt-3 ${status.bg}`}>
            <Text className={`text-xs font-bold ${status.text}`}>{t(status.label)}</Text>
          </View>
        </View>
      </View>

      <View className="px-5 mt-5">
        {/* Bloc dédié : toute la carte est cliquable (Pressable + styles explicites pour le web) */}
        <View
          className="bg-white rounded-[22px] mb-4 border border-gray-100 shadow-sm"
          style={Platform.OS === 'web' ? ({ overflow: 'visible' } as const) : undefined}
        >
          {hasReceipt ? (
            <Pressable
              onPress={openReceiptModal}
              accessibilityRole="button"
              accessibilityLabel={t('expense.openOriginalReceipt')}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              style={({ pressed }) => [
                {
                  width: '100%',
                  opacity: pressed ? 0.9 : 1,
                  minHeight: THUMB + 32,
                },
                Platform.OS === 'web' ? { cursor: 'pointer' } : null,
              ]}
            >
              <View className="flex-row items-center p-4">
                <View
                  className="rounded-xl bg-gray-100 items-center justify-center border border-gray-200"
                  style={{
                    width: THUMB,
                    height: THUMB,
                    overflow: 'hidden',
                  }}
                >
                  {thumbLoading ? (
                    <ActivityIndicator size="small" color={theme.brandPrimary} />
                  ) : thumbUri ? (
                    <Image
                      source={{ uri: thumbUri }}
                      style={{ width: THUMB, height: THUMB }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-3xl">📷</Text>
                  )}
                </View>
                <View className="flex-1 ml-3 min-w-0">
                  <Text className="text-gray-900 font-semibold text-base">
                    {t('expense.openOriginalReceipt')}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    {t('employee.receiptAttachedHint')}
                  </Text>
                </View>
                <Text className="text-primary-600 text-xl font-medium pl-1">›</Text>
              </View>
            </Pressable>
          ) : (
            <View className="flex-row items-center p-4 opacity-70">
              <View
                className="rounded-xl bg-gray-100 items-center justify-center"
                style={{ width: THUMB, height: THUMB }}
              >
                <Text className="text-3xl">📄</Text>
              </View>
              <Text className="flex-1 ml-3 text-gray-600 text-base">
                {t('expense.noReceiptAttached')}
              </Text>
            </View>
          )}
        </View>

        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
          <Text className="text-gray-900 font-bold text-lg mb-4">{t('expense.receipt')}</Text>

          {(expenseRow.profiles as Profile | undefined)?.full_name && (
            <InfoRow
              label={t('admin.employee')}
              value={(expenseRow.profiles as Profile).full_name}
            />
          )}
          <InfoRow label={t('expense.date')} value={formatDate(expenseRow.receipt_date)} />
          <InfoRow label={t('expense.supplier')} value={expenseRow.supplier} />
          <InfoRow label={t('expense.category')} value={t(`expense.${expenseRow.category}`)} />
          {expenseRow.description && (
            <InfoRow label={t('expense.description')} value={expenseRow.description} />
          )}
          {expenseRow.accounting_code && (
            <InfoRow label={t('expense.accountingCode')} value={expenseRow.accounting_code} />
          )}
        </View>

        <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
          <Text className="text-gray-900 font-bold text-lg mb-4">{t('expense.vat')}</Text>
          <InfoRow label={t('expense.amountHT')} value={formatCurrency(expenseRow.amount_ht)} />
          {expenseRow.vat_details.map((vat, i) => (
            <View key={i} className="flex-row justify-between py-2 border-b border-gray-50">
              <Text className="text-gray-500">
                TVA {vat.rate}% ({t('expense.vatBase')}: {formatCurrency(vat.base)})
              </Text>
              <Text className="text-gray-900 font-medium">{formatCurrency(vat.amount)}</Text>
            </View>
          ))}
          <View className="flex-row justify-between py-3 mt-2">
            <Text className="text-gray-900 font-bold text-base">{t('expense.amountTTC')}</Text>
            <Text className="text-primary-600 font-bold text-lg">
              {formatCurrency(expenseRow.amount_ttc)}
            </Text>
          </View>
        </View>

        {expenseRow.is_fiscal_alert && (
          <View className="bg-red-50 rounded-[22px] p-4 mb-4 border border-red-100">
            <Text className="text-red-800 font-bold">⚠️ {t('alerts.fiscalTitle')}</Text>
            <Text className="text-red-600 text-sm mt-1">
              {t('alerts.fiscalMessage', { threshold: 150 })}
            </Text>
          </View>
        )}

        {expenseRow.rejection_reason && (
          <View className="bg-red-50 rounded-[22px] p-4 mb-4 border border-red-100">
            <Text className="text-red-800 font-bold">{t('admin.rejectionReason')}</Text>
            <Text className="text-red-600 text-sm mt-1">{expenseRow.rejection_reason}</Text>
          </View>
        )}
      </View>

      <Modal
        visible={receiptModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeReceiptModal}
      >
        <View className="flex-1 bg-black/95 pt-14">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
            <Text className="text-white font-semibold text-base flex-1 pr-2">
              {t('expense.receiptPreviewTitle')}
            </Text>
            <TouchableOpacity
              onPress={closeReceiptModal}
              className="bg-white/15 rounded-full px-4 py-2"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text className="text-white font-medium">{t('common.close')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 16,
              paddingHorizontal: 8,
            }}
            showsVerticalScrollIndicator
          >
            {modalLoading && (
              <View className="py-20">
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="text-white/80 text-center mt-4 text-sm">{t('common.loading')}</Text>
              </View>
            )}
            {!modalLoading && modalUri && !modalError && (
              <Image
                source={{ uri: modalUri }}
                style={{
                  width: windowW - 16,
                  height: modalImageMaxH,
                  backgroundColor: '#1f2937',
                }}
                resizeMode="contain"
                onError={() => setModalError(true)}
              />
            )}
            {!modalLoading && modalError && (
              <Text className="text-white/90 text-center px-6 py-10 text-base">
                {t('expense.receiptLoadError')}
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-2.5 border-b border-gray-50">
    <Text className="text-gray-500">{label}</Text>
    <Text className="text-gray-900 font-medium">{value}</Text>
  </View>
);
