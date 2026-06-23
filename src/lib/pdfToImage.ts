import i18n from '../i18n';

export type PdfJpegResult = {
  uri: string;
  base64: string;
};

/** Sur iOS/Android, la conversion PDF se fait côté serveur (Edge Function). */
export async function pdfUriToJpegDataUri(_uri: string): Promise<PdfJpegResult> {
  throw new Error(i18n.t('errors.pdfNativeConversion'));
}
