import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme, headerPaddingTop } from '../../config/theme';
import { getLegalInterpolation } from '../../config/legalPublisher';
import { IS_WEB, WEB_PAGE_GUTTER_CLASS } from '../../config/webLayout';

export type LegalDocKind = 'mentions' | 'privacy' | 'terms';

export type LegalDocumentStackParams = {
  LegalDocument: { kind: LegalDocKind };
};

type Props = NativeStackScreenProps<LegalDocumentStackParams, 'LegalDocument'>;

export const LegalDocumentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { kind } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pageX = IS_WEB ? WEB_PAGE_GUTTER_CLASS : 'px-5';

  const interpolation = useMemo(() => getLegalInterpolation(), []);
  const title = t(`legal.documents.${kind}.title`);
  const body = t(`legal.documents.${kind}.body`, interpolation);
  const paragraphs = useMemo(
    () =>
      body
        .split(/\n\s*\n/g)
        .map(p => p.trim())
        .filter(Boolean),
    [body]
  );

  return (
    <View className="flex-1 bg-surface">
      <View
        className={`flex-row items-center border-b border-gray-100 bg-white ${pageX}`}
        style={{
          paddingTop: headerPaddingTop(insets.top),
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="flex-row items-center py-1 pr-3"
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={26} color={theme.brandInk} />
          <Text className="text-base font-semibold text-gray-900 ml-0.5">{t('common.back')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className={`flex-1 ${pageX}`}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 24) + 24,
        }}
        style={IS_WEB ? { alignSelf: 'center', width: '100%', maxWidth: 900 } : undefined}
      >
        <View>
          <Text className="text-2xl font-bold text-gray-900 mb-4">{title}</Text>
          {paragraphs.map((p, i) => (
            <Text key={i} className="text-gray-700 text-base leading-6 mb-4">
              {p}
            </Text>
          ))}
          <Text className="text-gray-400 text-xs mt-2 mb-8">
            {t('legal.footerNotice', interpolation)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};
