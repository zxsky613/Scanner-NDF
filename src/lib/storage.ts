import { readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { STORAGE_BUCKET } from '../config/constants';
import { decode } from 'base64-arraybuffer';
import i18n from '../i18n';
import {
  receiptContentType,
  receiptStorageExtension,
  RECEIPT_MAX_BYTES,
} from './receiptMime';

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(i18n.t('errors.storageImageRead', { status: String(res.status) }));
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > RECEIPT_MAX_BYTES) {
      throw new Error(i18n.t('errors.receiptFileTooLarge'));
    }
    return buf;
  }
  const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > RECEIPT_MAX_BYTES) {
    throw new Error(i18n.t('errors.receiptFileTooLarge'));
  }
  return decode(base64);
}

export const uploadReceiptFile = async (
  uri: string,
  userId: string,
  mimeType?: string | null,
  fileName?: string | null
): Promise<string | null> => {
  try {
    const body = await uriToArrayBuffer(uri);
    const ext = receiptStorageExtension(uri, mimeType, fileName);
    const contentType = receiptContentType(uri, mimeType, fileName);
    const fileNameStored = `${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileNameStored, body, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    // Chemin relatif (bucket privé) — l’app génère une URL signée / data URL à l’affichage.
    return fileNameStored;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
};

/** @deprecated Utiliser uploadReceiptFile */
export const uploadReceiptImage = uploadReceiptFile;
