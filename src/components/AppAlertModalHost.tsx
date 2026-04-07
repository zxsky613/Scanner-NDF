import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { registerAppAlertHandler, AppAlertPayload } from '../utils/alert';

export const AppAlertModalHost: React.FC = () => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardMax = Math.min(400, width - 48);

  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<AppAlertPayload>({ title: '', message: '' });

  const show = useCallback((p: AppAlertPayload) => {
    setPayload(p);
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    registerAppAlertHandler(show);
    return () => registerAppAlertHandler(null);
  }, [show]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={hide}
    >
      <View className="flex-1 justify-center items-center px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          className="absolute inset-0 bg-black/50"
          onPress={hide}
        />
        <View
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg"
          style={{ width: cardMax, maxWidth: 400 }}
        >
          <Text className="text-xl font-bold text-gray-900">{payload.title}</Text>
          {payload.message ? (
            <Text className="text-base text-gray-600 mt-4 leading-6">{payload.message}</Text>
          ) : null}
          <TouchableOpacity
            className="mt-6 bg-primary-600 rounded-xl py-3.5 items-center active:opacity-90"
            onPress={hide}
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold text-base">{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
