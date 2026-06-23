import i18n from '../i18n';

export type PdfJpegResult = {
  uri: string;
  base64: string;
};

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('data:')) {
    const comma = uri.indexOf(',');
    if (comma === -1) throw new Error(i18n.t('errors.pdfReadFailed'));
    const header = uri.slice(0, comma);
    const payload = uri.slice(comma + 1);
    if (/;base64/i.test(header)) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }
    const decoded = decodeURIComponent(payload);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
    return bytes.buffer;
  }

  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(i18n.t('errors.pdfReadFailed'));
  }
  return await res.arrayBuffer();
}

/** Convertit la 1re page d’un PDF en JPEG (web uniquement). */
export async function pdfUriToJpegDataUri(uri: string): Promise<PdfJpegResult> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const data = await uriToArrayBuffer(uri);
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(i18n.t('errors.pdfReadFailed'));

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const comma = dataUrl.indexOf(',');
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : '';
  if (!base64) throw new Error(i18n.t('errors.pdfReadFailed'));

  return { uri: dataUrl, base64 };
}
