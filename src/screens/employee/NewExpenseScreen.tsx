import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Profile, ExpenseCategory, VatDetail, CATEGORY_ACCOUNTING_CODES } from '../../types';
import { useExpenses } from '../../hooks/useExpenses';
import { extractReceiptData } from '../../lib/aiExtraction';
import { uploadReceiptImage } from '../../lib/storage';
import { FISCAL_ALERT_THRESHOLD } from '../../config/constants';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  profile: Profile;
}

const categories: { value: ExpenseCategory; icon: string }[] = [
  { value: 'food', icon: '🍽️' },
  { value: 'materials', icon: '🔧' },
  { value: 'travel', icon: '🚗' },
];

export const NewExpenseScreen: React.FC<Props> = ({ navigation, profile }) => {
  const { t } = useTranslation();
  const { createExpense, checkDuplicate } = useExpenses(profile.id);
  const [permission, requestPermission] = useCameraPermissions();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = React.useRef<CameraView>(null);

  const [receiptDate, setReceiptDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amountHT, setAmountHT] = useState('');
  const [amountTTC, setAmountTTC] = useState('');
  const [vatDetails, setVatDetails] = useState<VatDetail[]>([
    { rate: 20, base: 0, amount: 0 },
  ]);
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [description, setDescription] = useState('');

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t('alerts.cameraPermission'), t('alerts.cameraPermissionMsg'));
        return;
      }
    }
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        setImageUri(photo.uri);
        setShowCamera(false);
        analyzeImage(photo.uri);
      }
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      analyzeImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async (uri: string) => {
    setAnalyzing(true);
    try {
      const data = await extractReceiptData(uri);
      setReceiptDate(data.date);
      setSupplier(data.supplier);
      setAmountHT(data.amount_ht.toString());
      setAmountTTC(data.amount_ttc.toString());
      if (data.vat_details.length > 0) {
        setVatDetails(data.vat_details);
      }
      Alert.alert(t('common.success'), t('employee.analysisComplete'));
    } catch {
      Alert.alert(t('common.error'), t('employee.analysisFailed'));
    } finally {
      setAnalyzing(false);
    }
  };

  const addVatRate = () => {
    setVatDetails(prev => [...prev, { rate: 0, base: 0, amount: 0 }]);
  };

  const removeVatRate = (index: number) => {
    setVatDetails(prev => prev.filter((_, i) => i !== index));
  };

  const updateVatDetail = (index: number, field: keyof VatDetail, value: string) => {
    setVatDetails(prev =>
      prev.map((v, i) => (i === index ? { ...v, [field]: parseFloat(value) || 0 } : v))
    );
  };

  const handleSubmit = async () => {
    if (!receiptDate || !supplier || !amountHT || !amountTTC) {
      Alert.alert(t('common.error'), t('expense.submitError'));
      return;
    }

    const ttc = parseFloat(amountTTC);

    if (ttc > FISCAL_ALERT_THRESHOLD) {
      Alert.alert(
        t('alerts.fiscalTitle'),
        t('alerts.fiscalMessage', { threshold: FISCAL_ALERT_THRESHOLD })
      );
    }

    const isDuplicate = await checkDuplicate(receiptDate, supplier, ttc);
    if (isDuplicate) {
      const proceed = await new Promise<boolean>(resolve => {
        Alert.alert(t('alerts.duplicateTitle'), t('alerts.duplicateMessage'), [
          { text: t('common.cancel'), onPress: () => resolve(false) },
          { text: t('alerts.continue'), onPress: () => resolve(true) },
        ]);
      });
      if (!proceed) return;
    }

    setSaving(true);
    try {
      let receiptUrl: string | undefined;
      if (imageUri) {
        const url = await uploadReceiptImage(imageUri, profile.id);
        if (url) receiptUrl = url;
      }

      const { error } = await createExpense({
        receipt_date: receiptDate,
        supplier,
        amount_ht: parseFloat(amountHT),
        amount_ttc: ttc,
        vat_details: vatDetails,
        category,
        description: description || undefined,
        receipt_image_url: receiptUrl,
      });

      if (error) throw error;
      Alert.alert(t('common.success'), t('expense.submitSuccess'));
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('expense.submitError'));
    } finally {
      setSaving(false);
    }
  };

  if (showCamera) {
    /* Pas de className sur CameraView (iOS). Pas d’enfants dans CameraView (doc Expo) → overlay en sibling. */
    return (
      <View style={styles.cameraRoot}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
        <View style={styles.cameraOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.shutterOuter}
            onPress={capturePhoto}
            accessibilityRole="button"
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelCam} onPress={() => setShowCamera(false)}>
            <Text style={styles.cancelCamText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="bg-primary-600 pt-14 pb-6 px-6 rounded-b-3xl">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text className="text-white text-lg">← {t('common.back')}</Text>
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold flex-1">
              {t('employee.newExpense')}
            </Text>
          </View>
        </View>

        <View className="px-4 mt-6">
          {/* Image capture buttons */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              className="flex-1 bg-white border border-gray-200 rounded-2xl py-4 items-center"
              onPress={handleTakePhoto}
            >
              <Text className="text-2xl mb-1">📸</Text>
              <Text className="text-gray-700 font-medium text-sm">
                {t('employee.takePhoto')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white border border-gray-200 rounded-2xl py-4 items-center"
              onPress={handlePickImage}
            >
              <Text className="text-2xl mb-1">📁</Text>
              <Text className="text-gray-700 font-medium text-sm">
                {t('employee.uploadReceipt')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview image */}
          {imageUri && (
            <View className="mb-4 rounded-2xl overflow-hidden border border-gray-200">
              <Image
                source={{ uri: imageUri }}
                className="w-full h-48"
                resizeMode="cover"
              />
            </View>
          )}

          {analyzing && (
            <View className="bg-primary-50 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
              <ActivityIndicator color="#2563eb" />
              <Text className="text-primary-700 font-medium">{t('employee.analyzing')}</Text>
            </View>
          )}

          {/* Form */}
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-1.5">{t('expense.date')}</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                value={receiptDate}
                onChangeText={setReceiptDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-1.5">{t('expense.supplier')}</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                value={supplier}
                onChangeText={setSupplier}
                placeholder={t('expense.supplier')}
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-1.5">{t('expense.amountHT')}</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  value={amountHT}
                  onChangeText={setAmountHT}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-1.5">{t('expense.amountTTC')}</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  value={amountTTC}
                  onChangeText={setAmountTTC}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-1.5">{t('expense.description')}</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                value={description}
                onChangeText={setDescription}
                placeholder={t('expense.description')}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* VAT Details */}
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <Text className="text-gray-900 font-bold text-base mb-3">{t('expense.vat')}</Text>
            {vatDetails.map((vat, index) => (
              <View key={index} className="flex-row gap-2 mb-3 items-end">
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs mb-1">{t('expense.vatRate')} %</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900"
                    value={vat.rate.toString()}
                    onChangeText={v => updateVatDetail(index, 'rate', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs mb-1">{t('expense.vatBase')}</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900"
                    value={vat.base.toString()}
                    onChangeText={v => updateVatDetail(index, 'base', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs mb-1">{t('expense.vatAmount')}</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900"
                    value={vat.amount.toString()}
                    onChangeText={v => updateVatDetail(index, 'amount', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                {vatDetails.length > 1 && (
                  <TouchableOpacity
                    className="bg-red-50 rounded-xl px-3 py-2.5"
                    onPress={() => removeVatRate(index)}
                  >
                    <Text className="text-red-500 text-sm">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              className="border border-dashed border-primary-300 rounded-xl py-2.5 items-center mt-1"
              onPress={addVatRate}
            >
              <Text className="text-primary-600 font-medium text-sm">
                + {t('expense.addVatRate')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category */}
          <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
            <Text className="text-gray-900 font-bold text-base mb-3">{t('expense.category')}</Text>
            <View className="flex-row gap-3">
              {categories.map(c => (
                <TouchableOpacity
                  key={c.value}
                  className={`flex-1 py-4 rounded-xl items-center border ${
                    category === c.value
                      ? 'bg-primary-50 border-primary-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onPress={() => setCategory(c.value)}
                >
                  <Text className="text-2xl mb-1">{c.icon}</Text>
                  <Text
                    className={`font-medium text-xs ${
                      category === c.value ? 'text-primary-700' : 'text-gray-600'
                    }`}
                  >
                    {t(`expense.${c.value}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center ${saving ? 'bg-primary-400' : 'bg-primary-600'}`}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 48 : 24,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#d1d5db',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
  },
  cancelCam: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelCamText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
