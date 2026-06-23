import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { resolveReceiptImageUri } from './receiptImageUrl';

function inferMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/** Nom de fichier sûr pour l’enregistrement (ticket-{id}.ext). */
export function suggestReceiptFileName(expenseId: string, storedUrl: string | null | undefined): string {
  const safeId = expenseId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const url = storedUrl ?? '';
  const m = url.match(/\.(pdf|jpe?g|png|gif|webp)(\?|#|$)/i);
  const ext = m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
  return `ticket-${safeId}.${ext}`;
}

async function writeDataUrlToFile(dataUrl: string, dest: string): Promise<void> {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) throw new Error('BAD_DATA_URL');
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (!/;base64/i.test(header)) throw new Error('NOT_BASE64');
  await FileSystem.writeAsStringAsync(dest, payload, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Web : téléchargement direct du fichier.
 * Natif : enregistrement en cache puis feuille de partage (Enregistrer dans Fichiers / Photos, etc.).
 */
export async function downloadReceiptFile(
  storedUrl: string,
  fileName: string
): Promise<void> {
  const uri = await resolveReceiptImageUri(storedUrl);
  if (!uri) throw new Error('NO_URI');

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const res = await fetch(uri);
    if (!res.ok) throw new Error('FETCH_FAILED');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
    }
    return;
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) throw new Error('NO_BASE_DIR');
  const dest = `${baseDir}${fileName}`;

  let localUri: string;
  if (uri.startsWith('data:')) {
    await writeDataUrlToFile(uri, dest);
    localUri = dest;
  } else {
    const { uri: downloaded } = await FileSystem.downloadAsync(uri, dest);
    localUri = downloaded;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('SHARE_UNAVAILABLE');

  await Sharing.shareAsync(localUri, {
    mimeType: inferMimeType(fileName),
    dialogTitle: fileName,
  });
}
