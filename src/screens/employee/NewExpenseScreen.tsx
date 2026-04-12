import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { Profile, Expense, ExpenseCategory, VatDetail } from '../../types';
import { useExpenses } from '../../hooks/useExpenses';
import { extractReceiptData } from '../../lib/aiExtraction';
import { uploadReceiptImage } from '../../lib/storage';
import { resolveReceiptImageUri } from '../../lib/receiptImageUrl';
import { FISCAL_ALERT_THRESHOLD } from '../../config/constants';
import { maskDateDMY, isoToDmyInput, dmyInputToIso } from '../../utils/dateFormat';
import { parseMoney, roundMoney } from '../../utils/money';
import { theme, headerPaddingTop, heroHeaderShadow } from '../../config/theme';
import { ScreenHeroTitle } from '../../components/ScreenHeroTitle';
import { showAppAlert, showAppConfirm } from '../../utils/alert';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  profile: Profile;
}

export type NewExpenseRouteParams = {
  NewExpense: { editExpense?: Expense };
};

const categories: { value: ExpenseCategory; icon: string }[] = [
  { value: 'food', icon: '🍽️' },
  { value: 'materials', icon: '🔧' },
  { value: 'travel', icon: '🚗' },
  { value: 'other', icon: '📋' },
];

function isLocalReceiptUri(uri: string): boolean {
  const u = uri.trim().toLowerCase();
  return (
    u.startsWith('file:') ||
    u.startsWith('content:') ||
    u.startsWith('ph:') ||
    u.startsWith('blob:') ||
    u.startsWith('data:') ||
    u.startsWith('assets-library:')
  );
}

function formatSubmitFailureDetail(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string };
    const parts = [e.message, e.details, e.hint].filter(p => typeof p === 'string' && p.trim());
    if (parts.length) return parts.join('\n');
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export const NewExpenseScreen: React.FC<Props> = ({ navigation, profile }) => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<NewExpenseRouteParams, 'NewExpense'>>();
  const editExpense = route.params?.editExpense;
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { createExpense, updateExpense, checkDuplicate } = useExpenses(profile.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialReceiptUrl, setInitialReceiptUrl] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [imageUri, setImageUri] = useState<string | null>(null);
  /** URL réellement affichable (signée / locale) — `imageUri` garde l’URL stockée ou le fichier local pour l’upload. */
  const [receiptDisplayUri, setReceiptDisplayUri] = useState<string | null>(null);
  const [receiptUriLoading, setReceiptUriLoading] = useState(false);
  const [receiptImageError, setReceiptImageError] = useState(false);
  const [receiptMenuVisible, setReceiptMenuVisible] = useState(false);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [receiptDisplayHeight, setReceiptDisplayHeight] = useState(360);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = React.useRef<CameraView>(null);

  /** Affichage JJ/MM/AAAA (séparateurs auto) ; conversion ISO à l’enregistrement. */
  const [receiptDateInput, setReceiptDateInput] = useState('');
  const [supplier, setSupplier] = useState('');
  const [city, setCity] = useState('');
  const [amountHT, setAmountHT] = useState('');
  const [amountTTC, setAmountTTC] = useState('');
  const [vatDetails, setVatDetails] = useState<VatDetail[]>([
    { rate: 20, base: 0, amount: 0 },
  ]);
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (receiptPreviewOpen) {
      setReceiptDisplayHeight(windowWidth * 1.25);
    }
  }, [receiptPreviewOpen, windowWidth]);

  useEffect(() => {
    let cancelled = false;
    if (!imageUri?.trim()) {
      setReceiptDisplayUri(null);
      setReceiptUriLoading(false);
      setReceiptImageError(false);
      return;
    }
    const raw = imageUri.trim();
    setReceiptImageError(false);
    if (isLocalReceiptUri(raw)) {
      setReceiptDisplayUri(raw);
      setReceiptUriLoading(false);
      return;
    }
    setReceiptUriLoading(true);
    resolveReceiptImageUri(raw).then(resolved => {
      if (!cancelled) {
        setReceiptDisplayUri(resolved?.trim() ? resolved : raw);
        setReceiptUriLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  useEffect(() => {
    if (!editExpense?.id) {
      setEditingId(null);
      setInitialReceiptUrl(null);
      return;
    }
    setEditingId(editExpense.id);
    setInitialReceiptUrl(editExpense.receipt_image_url ?? null);
    setReceiptDateInput(isoToDmyInput(editExpense.receipt_date));
    setSupplier(editExpense.supplier);
    setCity(editExpense.city?.trim() ? editExpense.city : '');
    setAmountHT(roundMoney(editExpense.amount_ht).toFixed(2));
    setAmountTTC(roundMoney(editExpense.amount_ttc).toFixed(2));
    setCategory(editExpense.category);
    setDescription(editExpense.description ?? '');
    setImageUri(editExpense.receipt_image_url ?? null);
    const vatAmt = roundMoney(Math.max(0, editExpense.amount_ttc - editExpense.amount_ht));
    const rate =
      editExpense.amount_ht > 0.001
        ? roundMoney((100 * vatAmt) / editExpense.amount_ht)
        : 20;
    setVatDetails([
      {
        rate: Number.isFinite(rate) ? rate : 20,
        base: roundMoney(editExpense.amount_ht),
        amount: vatAmt,
      },
    ]);
  }, [editExpense?.id]);

  const handleTakePhoto = async () => {
    setReceiptMenuVisible(false);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showAppAlert(t('alerts.cameraPermission'), t('alerts.cameraPermissionMsg'), 'error');
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
    setReceiptMenuVisible(false);
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
      if (data.city?.trim()) setCity(data.city.trim());
      const ht = roundMoney(data.amount_ht);
      const ttc = roundMoney(data.amount_ttc);
      setAmountHT(ht.toFixed(2));
      setAmountTTC(ttc.toFixed(2));
      const vatAmt = roundMoney(Math.max(0, ttc - ht));
      const rate =
        ht > 0.001 ? roundMoney((100 * vatAmt) / ht) : data.vat_details[0]?.rate > 0
          ? roundMoney(data.vat_details[0].rate)
          : 0;
      setVatDetails([{ rate: Number.isFinite(rate) ? rate : 0, base: ht, amount: vatAmt }]);
      showAppAlert(t('common.success'), t('employee.analysisComplete'), 'success');
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showAppAlert(t('common.error'), `${t('employee.analysisFailed')}\n\n${detail}`, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  /**
   * Une ligne TVA : calculée depuis HT et TTC (ticket).
   * TVA = TTC − HT ; taux affiché = équivalent global (100 × TVA / HT), informatif.
   */
  useEffect(() => {
    setVatDetails(prev => {
      if (prev.length !== 1) return prev;
      const ht = parseMoney(amountHT);
      const ttc = parseMoney(amountTTC);
      if (ht === null) return prev;

      const base = roundMoney(ht);
      const amount =
        ttc !== null
          ? roundMoney(Math.max(0, ttc - base))
          : 0;

      const rate =
        base > 0.001 ? roundMoney((100 * amount) / base) : 0;
      const r = Number.isFinite(rate) && rate >= 0 ? rate : 0;

      const next = { rate: r, base, amount };
      const p = prev[0];
      if (
        Math.abs(p.rate - next.rate) < 0.0001 &&
        Math.abs(p.base - next.base) < 0.0001 &&
        Math.abs(p.amount - next.amount) < 0.0001
      ) {
        return prev;
      }
      return [next];
    });
  }, [amountHT, amountTTC]);

  const onAmountHTChange = (text: string) => {
    setAmountHT(text);
  };

  const onAmountTTCChange = (text: string) => {
    setAmountTTC(text);
  };

  const handleSubmit = async () => {
    const htVal = parseMoney(amountHT);
    const ttcVal = parseMoney(amountTTC);
    if (!receiptDateInput.trim()) {
      showAppAlert(t('common.error'), t('expense.receiptDateRequired'), 'error');
      return;
    }
    if (!supplier.trim()) {
      showAppAlert(t('common.error'), t('expense.supplierRequired'), 'error');
      return;
    }
    if (htVal === null || ttcVal === null) {
      showAppAlert(t('common.error'), t('expense.amountsInvalid'), 'error');
      return;
    }

    if (!city.trim()) {
      showAppAlert(t('common.error'), t('expense.cityRequired'), 'error');
      return;
    }

    const receiptDateIso = dmyInputToIso(receiptDateInput);
    if (!receiptDateIso) {
      showAppAlert(t('common.error'), t('expense.dateInvalid'), 'error');
      return;
    }

    if (category === 'other' && !description.trim()) {
      showAppAlert(t('common.error'), t('expense.otherExplainRequired'), 'error');
      return;
    }

    if (!imageUri?.trim()) {
      showAppAlert(t('common.error'), t('expense.receiptRequired'), 'error');
      return;
    }

    const ttc = ttcVal;

    if (ttc + 0.001 < htVal) {
      showAppAlert(t('common.error'), t('expense.ttcLessThanHt'), 'error');
      return;
    }

    const proceedAfterVerify = await showAppConfirm(
      t('expense.verifyBeforeSubmitTitle'),
      t('expense.verifyBeforeSubmitMessage'),
      t('common.cancel'),
      editingId ? t('common.save') : t('employee.sendExpense')
    );
    if (!proceedAfterVerify) return;

    if (ttc > FISCAL_ALERT_THRESHOLD) {
      showAppAlert(
        t('alerts.fiscalTitle'),
        t('alerts.fiscalMessage', { threshold: FISCAL_ALERT_THRESHOLD })
      );
    }

    const isDuplicate = await checkDuplicate(receiptDateIso, supplier, ttc, editingId ?? undefined);
    if (isDuplicate) {
      const proceed = await showAppConfirm(
        t('alerts.duplicateTitle'),
        t('alerts.duplicateMessage'),
        t('common.cancel'),
        t('alerts.continue')
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      let receiptUrl: string | undefined;

      if (editingId) {
        if (imageUri && /^https?:\/\//i.test(imageUri.trim())) {
          receiptUrl = imageUri.trim().split(/[?#]/)[0];
        } else if (imageUri) {
          const up = await uploadReceiptImage(imageUri, profile.id);
          if (!up) {
            showAppAlert(t('common.error'), t('expense.uploadReceiptFailed'), 'error');
            return;
          }
          receiptUrl = up;
        } else {
          receiptUrl = initialReceiptUrl ?? undefined;
        }
        if (!receiptUrl?.trim()) {
          showAppAlert(t('common.error'), t('expense.receiptRequired'), 'error');
          return;
        }

        const { error } = await updateExpense(editingId, {
          receipt_date: receiptDateIso,
          supplier,
          city: city.trim(),
          amount_ht: htVal,
          amount_ttc: ttc,
          vat_details: vatDetails,
          category,
          description: description || undefined,
          receipt_image_url: receiptUrl,
        });

        if (error) throw error;
        showAppAlert(
          t('common.success'),
          t('expense.updateSuccess'),
          'success',
          () => navigation.goBack()
        );
      } else {
        const up = await uploadReceiptImage(imageUri!, profile.id);
        if (!up) {
          showAppAlert(t('common.error'), t('expense.uploadReceiptFailed'), 'error');
          return;
        }

        const { error } = await createExpense({
          receipt_date: receiptDateIso,
          supplier,
          city: city.trim(),
          amount_ht: htVal,
          amount_ttc: ttc,
          vat_details: vatDetails,
          category,
          description: description || undefined,
          receipt_image_url: up,
        });

        if (error) throw error;
        showAppAlert(
          t('common.success'),
          t('expense.submitSuccess'),
          'success',
          () => navigation.goBack()
        );
      }
    } catch (e) {
      const detail = formatSubmitFailureDetail(e);
      showAppAlert(
        t('common.error'),
        `${t('expense.submitError')}${detail ? `\n\n${detail}` : ''}`,
        'error'
      );
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
      className="flex-1 bg-surface"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          /* Tab bar + indicateur d’accueil : éviter que « Envoyer » paraisse absent ou coupé. */
          paddingBottom: Math.max(insets.bottom, 12) + 100,
        }}
      >
        <View className="px-5 pb-2" style={{ paddingTop: headerPaddingTop(insets.top) }}>
          <View
            className="rounded-[28px] px-5 py-5"
            style={{
              backgroundColor: theme.heroHeaderBg,
              borderWidth: 1,
              borderColor: theme.heroHeaderBorder,
              ...heroHeaderShadow,
            }}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
              <Text className="text-primary-600 text-base font-bold">← {t('common.back')}</Text>
            </TouchableOpacity>
            <ScreenHeroTitle variant="stack" className="mt-3">
              {editingId ? t('employee.editExpense') : t('employee.newExpense')}
            </ScreenHeroTitle>
            <Text className="text-gray-400 text-sm mt-2">{t('employee.scanReceipt')}</Text>
          </View>
        </View>

        <View className="px-5 mt-5">
          {/* Image capture buttons */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              className="flex-1 bg-white border border-gray-100 rounded-[22px] py-5 items-center shadow-sm"
              onPress={handleTakePhoto}
            >
              <Text className="text-2xl mb-1">📸</Text>
              <Text className="text-gray-700 font-medium text-sm">
                {t('employee.takePhoto')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white border border-gray-100 rounded-[22px] py-5 items-center shadow-sm"
              onPress={handlePickImage}
            >
              <Text className="text-2xl mb-1">📁</Text>
              <Text className="text-gray-700 font-medium text-sm">
                {t('employee.uploadReceipt')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Justificatif : menu voir / remplacer ; miniature via URL signée si besoin */}
          {imageUri && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setReceiptMenuVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('employee.receiptMenuTitle')}. ${t('employee.receiptAttachedHint')}`}
              style={styles.receiptCompactCard}
            >
              <View style={styles.receiptCompactThumb}>
                {receiptUriLoading ? (
                  <View className="flex-1 items-center justify-center bg-surface">
                    <ActivityIndicator color={theme.brandPrimary} />
                  </View>
                ) : receiptImageError ? (
                  <View className="flex-1 items-center justify-center bg-surface px-1">
                    <Text className="text-[10px] text-red-600 text-center leading-3">
                      {t('expense.receiptLoadError')}
                    </Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: receiptDisplayUri ?? imageUri }}
                    style={styles.receiptCompactImage}
                    resizeMode="cover"
                    onError={() => setReceiptImageError(true)}
                  />
                )}
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
            <View className="bg-primary-50 rounded-[22px] p-4 mb-4 flex-row items-center gap-3 border border-primary-100">
              <ActivityIndicator color={theme.brandPrimary} />
              <Text className="text-primary-700 font-medium">{t('employee.analyzing')}</Text>
            </View>
          )}

          {/* Form */}
          <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-1.5">{t('expense.receiptDate')}</Text>
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

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-1.5">{t('expense.city')}</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                value={city}
                onChangeText={setCity}
                placeholder={t('expense.cityPlaceholder')}
                placeholderTextColor="#9ca3af"
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

          {/* TVA : uniquement calculée depuis HT + TTC */}
          <View className="bg-white rounded-[22px] p-5 mb-4 border border-gray-100 shadow-sm">
            <Text className="text-gray-900 font-bold text-base mb-1">{t('expense.vat')}</Text>
            <Text className="text-gray-500 text-xs mb-4 leading-4">{t('expense.vatAutoExplanation')}</Text>
            {vatDetails[0] && (
              <View className="bg-surface rounded-2xl border border-gray-100 p-4">
                <View className="flex-row justify-between py-2 border-b border-gray-100">
                  <Text className="text-gray-500 text-sm">{t('expense.vatBase')}</Text>
                  <Text className="text-gray-900 font-semibold text-sm">
                    {roundMoney(vatDetails[0].base).toFixed(2)} €
                  </Text>
                </View>
                <View className="flex-row justify-between py-2 border-b border-gray-100">
                  <Text className="text-gray-500 text-sm">{t('expense.vatAmount')}</Text>
                  <Text className="text-gray-900 font-semibold text-sm">
                    {roundMoney(vatDetails[0].amount).toFixed(2)} €
                  </Text>
                </View>
                <View className="flex-row justify-between py-2">
                  <Text className="text-gray-500 text-sm">{t('expense.vatEquivalentRate')}</Text>
                  <Text className="text-primary-600 font-bold text-sm">
                    {roundMoney(vatDetails[0].rate).toFixed(2)} %
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Category */}
          <View className="bg-white rounded-[22px] p-5 mb-6 border border-gray-100 shadow-sm">
            <Text className="text-gray-900 font-bold text-base mb-3">{t('expense.category')}</Text>
            <View className="flex-row flex-wrap gap-3">
              {categories.map(c => (
                <TouchableOpacity
                  key={c.value}
                  className={`min-w-[44%] flex-1 py-4 rounded-2xl items-center border ${
                    category === c.value
                      ? 'bg-primary-50 border-primary-500'
                      : 'bg-surface border-gray-100'
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
            className={`rounded-full py-4 items-center ${saving ? 'bg-primary-400' : 'bg-primary-600'}`}
            onPress={handleSubmit}
            disabled={saving}
            style={
              saving
                ? undefined
                : {
                    shadowColor: theme.brandPrimary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 8,
                  }
            }
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                {editingId ? t('common.save') : t('employee.sendExpense')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={receiptPreviewOpen && !!(receiptDisplayUri ?? imageUri)}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setReceiptPreviewOpen(false)}
      >
        <View className="flex-1 bg-black">
          <View
            className="flex-row items-center justify-end gap-2 px-3 pb-3 border-b border-gray-800 flex-wrap"
            style={{ paddingTop: Math.max(insets.top, 12) + 8 }}
          >
            <Text className="text-white font-semibold text-base flex-1 min-w-[120px] pr-2">
              {t('employee.receiptFullTitle')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setReceiptPreviewOpen(false);
                setReceiptMenuVisible(true);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="py-2 px-3 bg-gray-800 rounded-lg"
            >
              <Text className="text-amber-300 font-medium text-sm">{t('employee.receiptReplace')}</Text>
            </TouchableOpacity>
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
            {receiptDisplayUri ?? imageUri ? (
              <Image
                source={{ uri: (receiptDisplayUri ?? imageUri) as string }}
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

      <Modal
        visible={receiptMenuVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setReceiptMenuVisible(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/45"
            onPress={() => setReceiptMenuVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <View
            className="bg-white rounded-t-[28px] border-t border-gray-100"
            style={{
              paddingBottom: Math.max(insets.bottom, 20) + 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View className="items-center pt-3 pb-1">
              <View className="w-9 h-1 rounded-full bg-gray-200" />
            </View>
            <View className="px-5 pt-4">
              <Text className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.14em] mb-2">
                {t('employee.receiptMenuSubtitle')}
              </Text>
              <ScreenHeroTitle variant="stack" className="leading-8">
                {t('employee.receiptMenuTitle')}
              </ScreenHeroTitle>
            </View>
            <View className="h-px bg-gray-200/90 mx-5 mt-5 mb-3" />
            <View className="mx-5 rounded-[20px] border border-gray-100 bg-surface overflow-hidden">
              <TouchableOpacity
                className={`flex-row items-center px-4 py-4 border-b border-gray-100/90 ${receiptUriLoading ? 'opacity-45' : 'active:bg-white'}`}
                disabled={receiptUriLoading}
                onPress={() => {
                  setReceiptMenuVisible(false);
                  setReceiptPreviewOpen(true);
                }}
              >
                <View className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-gray-100">
                  <Ionicons name="expand-outline" size={22} color={theme.brandPrimary} />
                </View>
                <Text className="ml-3 flex-1 text-[15px] font-medium text-gray-800 leading-5">
                  {t('employee.receiptMenuViewFull')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-4 border-b border-gray-100/90 active:bg-white"
                onPress={() => void handlePickImage()}
              >
                <View className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-gray-100">
                  <Ionicons name="images-outline" size={22} color={theme.brandPrimary} />
                </View>
                <Text className="ml-3 flex-1 text-[15px] font-medium text-gray-800 leading-5">
                  {t('employee.receiptMenuGallery')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center px-4 py-4 active:bg-white"
                onPress={() => void handleTakePhoto()}
              >
                <View className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-gray-100">
                  <Ionicons name="camera-outline" size={22} color={theme.brandPrimary} />
                </View>
                <Text className="ml-3 flex-1 text-[15px] font-medium text-gray-800 leading-5">
                  {t('employee.receiptMenuCamera')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className="mx-5 mt-5 border border-gray-200 rounded-full py-3.5 items-center bg-white active:bg-gray-50"
              onPress={() => setReceiptMenuVisible(false)}
            >
              <Text className="text-[15px] font-semibold text-gray-700">{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    shadowColor: theme.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  receiptCompactThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: theme.surface,
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
    backgroundColor: theme.brandPrimary,
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
