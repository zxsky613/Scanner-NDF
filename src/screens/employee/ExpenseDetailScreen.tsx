import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Expense } from '../../types';
import { formatDate, formatCurrency } from '../../utils/dateFormat';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ ExpenseDetail: { expense: Expense } }, 'ExpenseDetail'>;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'expense.pending' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'expense.approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'expense.rejected' },
};

export const ExpenseDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { expense } = route.params;
  const status = statusConfig[expense.status];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-primary-600 pt-14 pb-6 px-6 rounded-b-3xl">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-white text-lg">← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">{expense.supplier}</Text>
          <View className={`px-3 py-1 rounded-full ${status.bg}`}>
            <Text className={`text-sm font-medium ${status.text}`}>
              {t(status.label)}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-4 mt-6">
        {expense.receipt_image_url && (
          <View className="bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100">
            <Image
              source={{ uri: expense.receipt_image_url }}
              className="w-full h-64"
              resizeMode="contain"
            />
          </View>
        )}

        <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
          <Text className="text-gray-900 font-bold text-lg mb-4">{t('expense.receipt')}</Text>

          <InfoRow label={t('expense.date')} value={formatDate(expense.receipt_date)} />
          <InfoRow label={t('expense.supplier')} value={expense.supplier} />
          <InfoRow label={t('expense.category')} value={t(`expense.${expense.category}`)} />
          {expense.description && (
            <InfoRow label={t('expense.description')} value={expense.description} />
          )}
          {expense.accounting_code && (
            <InfoRow label={t('expense.accountingCode')} value={expense.accounting_code} />
          )}
        </View>

        <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
          <Text className="text-gray-900 font-bold text-lg mb-4">{t('expense.vat')}</Text>
          <InfoRow label={t('expense.amountHT')} value={formatCurrency(expense.amount_ht)} />
          {expense.vat_details.map((vat, i) => (
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
              {formatCurrency(expense.amount_ttc)}
            </Text>
          </View>
        </View>

        {expense.is_fiscal_alert && (
          <View className="bg-red-50 rounded-2xl p-4 mb-4 border border-red-100">
            <Text className="text-red-800 font-semibold">⚠️ {t('alerts.fiscalTitle')}</Text>
            <Text className="text-red-600 text-sm mt-1">
              {t('alerts.fiscalMessage', { threshold: 150 })}
            </Text>
          </View>
        )}

        {expense.rejection_reason && (
          <View className="bg-red-50 rounded-2xl p-4 mb-4 border border-red-100">
            <Text className="text-red-800 font-semibold">{t('admin.rejectionReason')}</Text>
            <Text className="text-red-600 text-sm mt-1">{expense.rejection_reason}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-2.5 border-b border-gray-50">
    <Text className="text-gray-500">{label}</Text>
    <Text className="text-gray-900 font-medium">{value}</Text>
  </View>
);
