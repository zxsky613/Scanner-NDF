import { supabase } from '../config/supabase';
import { STORAGE_BUCKET } from '../config/constants';

const UUID_FOLDER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/.+/i;

/**
 * Extrait la clé objet "userId/fichier.jpg" depuis une URL Supabase Storage.
 */
export function extractReceiptStoragePath(storedUrl: string, bucket: string = STORAGE_BUCKET): string | null {
  const trimmed = storedUrl.trim();

  if (trimmed.startsWith('data:') || trimmed.startsWith('file://') || trimmed.startsWith('blob:')) {
    return null;
  }

  // Chemin relatif en base : "uuid/1234567890.jpg"
  if (!trimmed.includes('://')) {
    const clean = trimmed.split(/[?#]/)[0];
    if (UUID_FOLDER.test(clean)) return clean;
  }

  const markers = [
    `/object/public/${bucket}/`,
    `/object/sign/${bucket}/`,
    `/object/authenticated/${bucket}/`,
  ];

  for (const m of markers) {
    const i = trimmed.indexOf(m);
    if (i !== -1) {
      let rest = trimmed.slice(i + m.length).split(/[?#]/)[0];
      try {
        rest = decodeURIComponent(rest);
      } catch {
        /* */
      }
      return rest || null;
    }
  }

  try {
    const u = new URL(trimmed);
    const segs = u.pathname.split('/').filter(Boolean);
    const b = segs.indexOf(bucket);
    if (b !== -1 && b < segs.length - 1) {
      return segs.slice(b + 1).join('/').replace(/\+/g, ' ');
    }
  } catch {
    /* */
  }

  const re = new RegExp(`/${bucket}/(.+?)(?:\\?|#|$)`, 'i');
  const m = trimmed.match(re);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }

  return null;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('FileReader'));
    r.readAsDataURL(blob);
  });
}

/**
 * URL affichable pour la session courante : data URL (fiable sur iOS) ou URL signée.
 */
export async function resolveReceiptImageUri(
  storedUrl: string | null | undefined
): Promise<string | undefined> {
  if (!storedUrl?.trim()) return undefined;

  const trimmed = storedUrl.trim();

  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const path = extractReceiptStoragePath(trimmed, STORAGE_BUCKET);
  if (!path) {
    if (__DEV__) {
      console.warn('[receiptImage] could not extract storage path from:', trimmed.slice(0, 120));
    }
    return undefined;
  }

  // Téléchargement → data URL : le plus fiable pour Image / WebView sur iOS (bucket privé).
  const dl = await supabase.storage.from(STORAGE_BUCKET).download(path);
  if (!dl.error && dl.data) {
    try {
      return await blobToDataUrl(dl.data);
    } catch (e) {
      if (__DEV__) console.warn('[receiptImage] blobToDataUrl:', e);
    }
  }

  if (__DEV__) {
    console.warn('[receiptImage] download:', dl.error?.message ?? dl.error, 'path=', path);
  }

  const signed = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  if (!signed.error && signed.data?.signedUrl) {
    return signed.data.signedUrl;
  }

  if (__DEV__) {
    console.warn('[receiptImage] createSignedUrl:', signed.error?.message ?? signed.error);
  }

  return undefined;
}
