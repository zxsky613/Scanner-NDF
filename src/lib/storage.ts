import { readAsStringAsync } from 'expo-file-system';
import { supabase } from '../config/supabase';
import { STORAGE_BUCKET } from '../config/constants';
import { decode } from 'base64-arraybuffer';

export const uploadReceiptImage = async (
  uri: string,
  userId: string
): Promise<string | null> => {
  try {
    const base64 = await readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const fileName = `${userId}/${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, decode(base64), {
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
