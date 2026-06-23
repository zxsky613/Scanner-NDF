export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export function isPdfMime(mime?: string | null): boolean {
  if (!mime) return false;
  return mime.trim().toLowerCase() === 'application/pdf';
}

export function isPdfFileName(name?: string | null): boolean {
  if (!name) return false;
  return name.trim().toLowerCase().endsWith('.pdf');
}

export function isPdfReceipt(
  uri?: string | null,
  mimeType?: string | null,
  fileName?: string | null
): boolean {
  if (isPdfMime(mimeType) || isPdfFileName(fileName)) return true;
  if (!uri) return false;
  const lower = uri.trim().toLowerCase().split(/[?#]/)[0];
  return lower.endsWith('.pdf') || lower.startsWith('data:application/pdf');
}

export function receiptStorageExtension(
  uri?: string | null,
  mimeType?: string | null,
  fileName?: string | null
): 'pdf' | 'jpg' {
  return isPdfReceipt(uri, mimeType, fileName) ? 'pdf' : 'jpg';
}

export function receiptContentType(
  uri?: string | null,
  mimeType?: string | null,
  fileName?: string | null
): 'application/pdf' | 'image/jpeg' {
  return isPdfReceipt(uri, mimeType, fileName) ? 'application/pdf' : 'image/jpeg';
}
