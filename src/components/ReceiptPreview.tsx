import React from 'react';
import { View, Text, Image, Platform, StyleSheet, type ImageStyle, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { isPdfReceipt } from '../lib/receiptMime';
import { ZoomableReceiptImage } from './ZoomableReceiptImage';

type Props = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  width: number;
  height: number;
  imageStyle?: ImageStyle;
  containerStyle?: ViewStyle;
  onError?: () => void;
  zoomable?: boolean;
};

function pdfEmbedHtml(uri: string): string {
  const safeUri = uri.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #111; }
  embed, iframe { width: 100%; height: 100%; border: 0; }
</style>
</head>
<body>
  <embed src="${safeUri}" type="application/pdf" />
</body></html>`;
}

export function ReceiptPreview({
  uri,
  mimeType,
  fileName,
  width,
  height,
  imageStyle,
  containerStyle,
  onError,
  zoomable = false,
}: Props) {
  const isPdf = isPdfReceipt(uri, mimeType, fileName);

  if (isPdf) {
    return (
      <View style={[{ width, height, overflow: 'hidden', backgroundColor: '#111' }, containerStyle]}>
        <WebView
          source={
            Platform.OS === 'web'
              ? { uri }
              : { html: pdfEmbedHtml(uri) }
          }
          style={{ flex: 1, backgroundColor: '#111' }}
          originWhitelist={['*']}
          onError={onError}
          onHttpError={onError}
          allowFileAccess
          allowUniversalAccessFromFileURLs
          scalesPageToFit
        />
      </View>
    );
  }

  if (zoomable) {
    return (
      <ZoomableReceiptImage
        uri={uri}
        width={width}
        height={height}
        onError={onError}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width, height }, imageStyle]}
      resizeMode="cover"
      onError={onError}
    />
  );
}

const styles = StyleSheet.create({
  pdfThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
});

export function ReceiptThumbnail({
  uri,
  mimeType,
  fileName,
  size,
  onError,
}: {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  size: number;
  onError?: () => void;
}) {
  const { t } = useTranslation();
  const isPdf = isPdfReceipt(uri, mimeType, fileName);

  if (isPdf) {
    return (
      <View style={[styles.pdfThumb, { width: size, height: size }]}>
        <Text style={{ fontSize: 28 }}>📄</Text>
        <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 4, fontWeight: '600' }}>
          {t('expense.receiptPdfBadge')}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size }}
      resizeMode="cover"
      onError={onError}
    />
  );
}
