import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Profile, ExpenseCategory, VatDetail } from '../../types';
import { useExpenses } from '../../hooks/useExpenses';
import { extractReceiptData } from '../../lib/aiExtraction';
import { uploadReceiptImage } from '../../lib/storage';
import { FISCAL_ALERT_THRESHOLD } from '../../config/constants';
import { maskDateDMY, isoToDmyInput, dmyInputToIso } from '../../utils/dateFormat';
import { parseMoney, roundMoney } from '../../utils/money';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  profile: Profile;
}

const categories: { value: ExpenseCategory; icon: string }[] = [
  { value: 'food', icon: '🍽️' },
  { value: 'materials', icon: '🔧' },
  { value: 'travel', icon: '🚗' },
  { value: 'other', icon: '📋' },
];

export const NewExpenseScreen: React.FC<Props> = ({ navigation, profile }) => {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { createExpense, checkDuplicate } = useExpenses(profile.id);
  const [permission, requestPermission] = useCameraPermissions();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [receiptDisplayHeight, setReceiptDisplayHeight] = useState(360);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = React.useRef<CameraView>(null);

  /** Affichage JJ/MM/AAAA (séparateurs auto) ; conversion ISO à l’enregistrement. */
  const [receiptDateInput, setReceiptDateInput] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amountHT, setAmountHT] = useState('');
  const [amountTTC, setAmountTTC] = useState('');
  const [vatDetails, setVatDetails] = useState<VatDetail[]>([
    { rate: 20, base: 0, amount: 0 },
  ]);
  /** Dernier montant HT ou TTC modifié — sert au recalcul quand le taux change */
  const lastAmountFieldRef = useRef<'ht' | 'ttc'>('ht');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (receiptPreviewOpen) {
      setReceiptDisplayHeight(windowWidth * 1.25);
    }
  }, [receiptPreviewOpen, windowWidth]);

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
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.65,
        base64: true,
      });
      if (photo) {
        setImageUri(photo.uri);
        setShowCamera(false);
        analyzeImage(photo.uri, photo.base64 ?? null);
      }
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      analyzeImage(asset.uri, asset.base64 ?? null);
    }
  };

  const analyzeImage = async (uri: string, inlineBase64?: string | null) => {
    setAnalyzing(true);
    try {
      const data = await extractReceiptData(uri, inlineBase64);
      setReceiptDateInput(isoToDmyInput(data.date));
      setSupplier(data.supplier);
      const ht = roundMoney(data.amount_ht);
      const ttc = roundMoney(data.amount_ttc);
      setAmountHT(ht.toFixed(2));
      setAmountTTC(ttc.toFixed(2));
      /* Le TTC du ticket est souvent le plus fiable → changement de taux recalcule le HT */
      lastAmountFieldRef.current = 'ttc';
      const rateAi = data.vat_details[0]?.rate ?? 20;
      const amount = roundMoney(ttc - ht);
      const base = roundMoney(ht);
      let rate = rateAi > 0 ? rateAi : 20;
      if (base > 0 && amount >= 0) {
        const ttcFromRate = roundMoney(base * (1 + rate / 100));
        if (Math.abs(ttc - ttcFromRate) > 0.05) {
          rate = roundMoney((100 * amount) / base);
          if (!Number.isFinite(rate) || rate < 0) rate = rateAi > 0 ? rateAi : 20;
        }
      }
      setVatDetails([{ rate, base, amount }]);
      Alert.alert(t('common.success'), t('employee.analysisComplete'));
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      Alert.alert(t('common.error'), `${t('employee.analysisFailed')}\n\n${detail}`);
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
      prev.map((v, i) => (i === index ? { ...v, [field]: parseMoney(value) ?? 0 } : v))
    );
  };

  const onAmountHTChange = (text: string) => {
    setAmountHT(text);
    lastAmountFieldRef.current = 'ht';
    setVatDetails(prev => {
      if (prev.length !== 1) return prev;
      const ht = parseMoney(text);
      if (ht === null) return prev;
      const ttcField = parseMoney(amountTTC);
      /* Si le TTC est déjà saisi : conserver TTC, TVA = TTC−HT, taux déduit */
      if (ttcField !== null && ttcField >= ht - 0.001) {
        const amount = roundMoney(Math.max(0, ttcField - ht));
        const impliedRate =
          ht > 0 && amount >= 0 ? roundMoney((100 * amount) / ht) : prev[0].rate;
        return [{ rate: impliedRate > 0 ? impliedRate : prev[0].rate, base: ht, amount }];
      }
      const rate = prev[0].rate;
      if (rate > 0) {
        const amount = roundMoney(ht * (rate / 100));
        const ttc = roundMoney(ht + amount);
        setAmountTTC(ttc.toFixed(2));
        return [{ rate, base: ht, amount }];
      }
      const ttc = ttcField;
      if (ttc !== null) {
        const amount = roundMoney(Math.max(0, ttc - ht));
        return [{ rate: 0, base: ht, amount }];
      }
      return [{ ...prev[0], base: ht }];
    });
  };

  const onAmountTTCChange = (text: string) => {
    setAmountTTC(text);
    lastAmountFieldRef.current = 'ttc';
    setVatDetails(prev => {
      if (prev.length !== 1) return prev;
      const ttc = parseMoney(text);
      if (ttc === null) return prev;
      const rate = prev[0].rate;
      const htField = parseMoney(amountHT);
      /* Si le HT saisi est valide et ≤ TTC : on le garde, TVA = TTC−HT, taux déduit */
      if (htField !== null && ttc >= htField - 0.001) {
        const amount = roundMoney(Math.max(0, ttc - htField));
        const impliedRate =
          htField > 0 && amount >= 0 ? roundMoney((100 * amount) / htField) : rate;
        return [{ rate: impliedRate > 0 ? impliedRate : rate, base: htField, amount }];
      }
      if (rate > 0) {
        const ht = roundMoney(ttc / (1 + rate / 100));
        const amount = roundMoney(ttc - ht);
        setAmountHT(ht.toFixed(2));
        return [{ rate, base: ht, amount }];
      }
      if (htField !== null) {
        const amount = roundMoney(Math.max(0, ttc - htField));
        return [{ rate: 0, base: htField, amount }];
      }
      return prev;
    });
  };

  const onVatRateFieldChange = (index: number, value: string) => {
    if (vatDetails.length !== 1) {
      updateVatDetail(index, 'rate', value);
      return;
    }
    const r = parseMoney(value);
    const rateNum = r !== null && r >= 0 ? r : 0;
    setVatDetails(prev => {
      if (prev.length !== 1) return prev;
      if (lastAmountFieldRef.current === 'ttc') {
        const ttc = parseMoney(amountTTC);
        if (ttc !== null && rateNum > 0) {
          const ht = roundMoney(ttc / (1 + rateNum / 100));
          const amount = roundMoney(ttc - ht);
          setAmountHT(ht.toFixed(2));
          return [{ rate: rateNum, base: ht, amount }];
        }
        return [{ ...prev[0], rate: rateNum }];
      }
      const ht = parseMoney(amountHT);
      if (ht !== null && rateNum > 0) {
        const amount = roundMoney(ht * (rateNum / 100));
        const ttc = roundMoney(ht + amount);
        setAmountTTC(ttc.toFixed(2));
        return [{ rate: rateNum, base: ht, amount }];
      }
      return [{ ...prev[0], rate: rateNum }];
    });
  };

  const handleSubmit = async () => {
    const htVal = parseMoney(amountHT);
    const ttcVal = parseMoney(amountTTC);
    if (!receiptDateInput.trim() || !supplier || htVal === null || ttcVal === null) {
      Alert.alert(t('common.error'), t('expense.submitError'));
      return;
    }

    const receiptDateIso = dmyInputToIso(receiptDateInput);
    if (!receiptDateIso) {
      Alert.alert(t('common.error'), t('expense.dateInvalid'));
      return;
    }

    if (category === 'other' && !description.trim()) {
      Alert.alert(t('common.error'), t('expense.otherExplainRequired'));
      return;
    }

    if (!imageUri?.trim()) {
      Alert.alert(t('common.error'), t('expense.receiptRequired'));
      return;
    }

    const ttc = ttcVal;

    if (ttc > FISCAL_ALERT_THRESHOLD) {
      Alert.alert(
        t('alerts.fiscalTitle'),
        t('alerts.fiscalMessage', { threshold: FISCAL_ALERT_THRESHOLD })
      );
    }

    const isDuplicate = await checkDuplicate(receiptDateIso, supplier, ttc);
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
      const receiptUrl = await uploadReceiptImage(imageUri, profile.id);
      if (!receiptUrl) {
        Alert.alert(t('common.error'), t('expense.uploadReceiptFailed'));
        return;
      }

      const { error } = await createExpense({
        receipt_date: receiptDateIso,
        supplier,
        amount_ht: htVal,
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

          {/* Justificatif : ligne compacte (aperçu plein écran au toucher) */}
          {imageUri && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setReceiptPreviewOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('employee.tapToViewFullReceipt')}
              style={styles.receiptCompactCard}
            >
              <View style={styles.receiptCompactThumb}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.receiptCompactImage}
                  resizeMode="contain"
                />
              </View>
              <View className="flex-1 ml-3 min-w-0">
                <Text className="text-gray-900 font-semibold text-sm">
                  {t('employee.receiptAttachedTitle')}
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  {t('employee.receiptAttachedHint')}
                </Text>
              </View>
              <Text className="text-primary-600 text-xl font-medium pl-2">›</Text>
            </TouchableOpacity>
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
                value={receiptDateInput}
                onChangeText={text => setReceiptDateInput(maskDateDMY(text))}
                placeholder={t('expense.datePlaceholder')}
                keyboardType="number-pad"
                maxLength={10}
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
                  onChangeText={onAmountHTChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-700 font-medium mb-1.5">{t('expense.amountTTC')}</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  value={amountTTC}
                  onChangeText={onAmountTTCChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            </View>

            {category !== 'other' && (
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
            )}
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
                    onChangeText={v => onVatRateFieldChange(index, v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs mb-1">{t('expense.vatBase')}</Text>
                  <TextInput
                    className={`border border-gray-200 rounded-xl px-3 py-2.5 text-sm ${
                      vatDetails.length === 1 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-900'
                    }`}
                    value={
                      vatDetails.length === 1
                        ? roundMoney(vat.base).toFixed(2)
                        : Number.isFinite(vat.base)
                          ? String(vat.base)
                          : '0'
                    }
                    onChangeText={v => updateVatDetail(index, 'base', v)}
                    keyboardType="decimal-pad"
                    editable={vatDetails.length > 1}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs mb-1">{t('expense.vatAmount')}</Text>
                  <TextInput
                    className={`border border-gray-200 rounded-xl px-3 py-2.5 text-sm ${
                      vatDetails.length === 1 ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-900'
                    }`}
                    value={
                      vatDetails.length === 1
                        ? roundMoney(vat.amount).toFixed(2)
                        : Number.isFinite(vat.amount)
                          ? String(vat.amount)
                          : '0'
                    }
                    onChangeText={v => updateVatDetail(index, 'amount', v)}
                    keyboardType="decimal-pad"
                    editable={vatDetails.length > 1}
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
            <View className="flex-row flex-wrap gap-3">
              {categories.map(c => (
                <TouchableOpacity
                  key={c.value}
                  className={`min-w-[44%] flex-1 py-4 rounded-xl items-center border ${
                    category === c.value
                      ? 'bg-primary-50 border-primary-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onPress={() => setCategory(c.value)}
                >
                  <Text className="text-2xl mb-1">{c.icon}</Text>
                  <Text
                    className={`font-medium text-xs text-center ${
                      category === c.value ? 'text-primary-700' : 'text-gray-600'
                    }`}
                  >
                    {t(`expense.${c.value}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {category === 'other' && (
              <View className="mt-4 pt-4 border-t border-gray-100">
                <Text className="text-gray-800 font-semibold text-sm mb-2">
                  {t('expense.otherExplainTitle')}
                </Text>
                <Text className="text-gray-500 text-xs mb-2">{t('expense.otherExplainHint')}</Text>
                <TextInput
                  className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-base text-gray-900 min-h-[100px]"
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('expense.otherExplainPlaceholder')}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            )}
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

      <Modal
        visible={receiptPreviewOpen && !!imageUri}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setReceiptPreviewOpen(false)}
      >
        <View className="flex-1 bg-black">
          <View
            className="flex-row items-center justify-between px-4 pb-3 border-b border-gray-800"
            style={{ paddingTop: Math.max(insets.top, 12) + 8 }}
          >
            <Text className="text-white font-semibold text-base flex-1 pr-2">
              {t('employee.receiptFullTitle')}
            </Text>
            <TouchableOpacity
              onPress={() => setReceiptPreviewOpen(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="py-2 px-3 bg-gray-800 rounded-lg"
            >
              <Text className="text-sky-300 font-medium">{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              alignItems: 'center',
            }}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator
            showsVerticalScrollIndicator
            centerContent={Platform.OS === 'ios'}
            bouncesZoom
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: windowWidth, height: receiptDisplayHeight }}
                resizeMode="contain"
                onLoad={e => {
                  const s = e.nativeEvent.source;
                  if (s?.width && s?.height && s.width > 0) {
                    setReceiptDisplayHeight((s.height / s.width) * windowWidth);
                  }
                }}
              />
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  receiptCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  receiptCompactThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  receiptCompactImage: {
    width: '100%',
    height: '100%',
  },
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
