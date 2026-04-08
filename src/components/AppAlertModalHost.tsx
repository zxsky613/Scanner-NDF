import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { registerAppAlertHandler, AppAlertPayload, AppAlertButton } from '../utils/alert';

export const AppAlertModalHost: React.FC = () => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardMax = Math.min(400, width - 48);

  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<AppAlertPayload>({
    title: '',
    message: '',
    variant: 'default',
  });
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const show = useCallback((p: AppAlertPayload) => {
    const next: AppAlertPayload = {
      ...p,
      variant: p.variant ?? 'default',
      message: p.message?.trim() ?? '',
    };
    payloadRef.current = next;
    setPayload(next);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    const cb = payloadRef.current.afterClose;
    setVisible(false);
    if (cb) {
      setTimeout(cb, 0);
    }
  }, []);

  const handleButtonPress = useCallback(
    (btn: AppAlertButton) => {
      btn.onPress?.();
      hide();
    },
    [hide]
  );

  const dismissFromBackdrop = useCallback(() => {
    const p = payloadRef.current;
    if (p.buttons?.length) {
      const cancel = p.buttons.find(b => b.role === 'cancel');
      if (cancel?.onPress) cancel.onPress();
      hide();
    } else {
      hide();
    }
  }, [hide]);

  useEffect(() => {
    registerAppAlertHandler(show);
    return () => registerAppAlertHandler(null);
  }, [show]);

  const titleClass =
    payload.variant === 'success'
      ? 'text-primary-600'
      : payload.variant === 'error'
        ? 'text-red-600'
        : 'text-gray-900';

  const buttons = payload.buttons?.length ? payload.buttons : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissFromBackdrop}
    >
      <View className="flex-1 justify-center items-center px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          className="absolute inset-0 bg-black/50"
          onPress={dismissFromBackdrop}
        />
        <View
          className="bg-white rounded-[28px] p-7 border border-gray-100 shadow-lg"
          style={{ width: cardMax, maxWidth: 400 }}
        >
          <Text className={`text-xl font-bold tracking-tight ${titleClass}`}>{payload.title}</Text>
          {payload.message ? (
            <Text className="text-base text-gray-600 mt-4 leading-6">{payload.message}</Text>
          ) : null}

          {buttons ? (
            <View className="flex-row gap-3 mt-7">
              {buttons.map((btn, i) => {
                const isCancel = btn.role === 'cancel';
                const isDest = btn.role === 'destructive';
                return (
                  <TouchableOpacity
                    key={`${btn.text}-${i}`}
                    className={`flex-1 rounded-full py-4 items-center active:opacity-90 ${
                      isCancel
                        ? 'border border-gray-200 bg-surface'
                        : isDest
                          ? 'bg-red-500'
                          : 'bg-primary-600'
                    }`}
                    onPress={() => handleButtonPress(btn)}
                    activeOpacity={0.85}
                  >
                    <Text
                      className={`font-bold text-base ${
                        isCancel ? 'text-gray-800' : 'text-white'
                      }`}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <TouchableOpacity
              className="mt-7 bg-primary-600 rounded-full py-4 items-center active:opacity-90"
              onPress={hide}
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-base">{t('common.ok')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};
