import { readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { STORAGE_BUCKET } from '../config/constants';
import { decode } from 'base64-arraybuffer';
import i18n from '../i18n';

async function imageUriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(i18n.t('errors.storageImageRead', { status: String(res.status) }));
    }
    return await res.arrayBuffer();
  }
  const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
  return decode(base64);
}

export const uploadReceiptImage = async (
  uri: string,
  userId: string
): Promise<string | null> => {
  try {
    const body = await imageUriToArrayBuffer(uri);
    const fileName = `${userId}/${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, body, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
};
