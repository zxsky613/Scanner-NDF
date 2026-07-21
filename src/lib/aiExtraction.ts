import * as ImageManipulator from 'expo-image-manipulator';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import i18n from '../i18n';
import { isPdfReceipt, RECEIPT_MAX_BYTES } from './receiptMime';
import { pdfUriToJpegDataUri } from './pdfToImage';
import {
  AIExtractionResult,
  ExpenseCategory,
  EXPENSE_CATEGORY_KEYS,
  VatDetail,
} from '../types';

/** Limite pratique pour base64 envoyé à l’Edge Function (~4 Mo). */
const MAX_B64_CHARS = 3_000_000;

function parseCategoryFromAi(raw: unknown): ExpenseCategory | undefined {
  if (typeof raw !== 'string') return undefined;
  const k = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (EXPENSE_CATEGORY_KEYS as readonly string[]).includes(k)
    ? (k as ExpenseCategory)
    : undefined;
}

/**
 * ImagePicker / Camera peuvent fournir du base64 directement.
 * Sur le web, les URI `blob:` → fetch + FileReader.
 */
async function getFileBase64(
  uri: string,
  inlineBase64?: string | null
): Promise<{ base64: string; mime: string }> {
  if (inlineBase64 && inlineBase64.length > 0) {
    return { base64: inlineBase64, mime: 'image/jpeg' };
  }

  if (uri.startsWith('data:')) {
    const m = uri.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      return { base64: m[2], mime: m[1].split(';')[0] || 'image/jpeg' };
    }
  }

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(i18n.t('errors.aiImageReadWeb', { status: String(res.status) }));
    }
    const blob = await res.blob();
    if (blob.size > RECEIPT_MAX_BYTES) {
      throw new Error(i18n.t('errors.receiptFileTooLarge'));
    }
    const mime =
      blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg';
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onloadend = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error ?? new Error('FileReader'));
      fr.readAsDataURL(blob);
    });
    const comma = dataUrl.indexOf(',');
    const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    return { base64: b64, mime };
  }

  const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > RECEIPT_MAX_BYTES) {
    throw new Error(i18n.t('errors.receiptFileTooLarge'));
  }
  return { base64, mime: 'image/jpeg' };
}

async function jpegBase64FromUri(uri: string, width: number, compress: number): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width } }],
    { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (result.base64) return result.base64;
  return readAsStringAsync(result.uri, { encoding: 'base64' });
}

/** Redimensionnement + JPEG avant envoi (limite taille Edge Function / Gemini). */
async function prepareImageForAi(
  uri: string,
  inlineBase64?: string | null
): Promise<{ base64: string; mime: string }> {
  try {
    let b64 = await jpegBase64FromUri(uri, 1280, 0.68);
    if (b64.length > MAX_B64_CHARS) {
      b64 = await jpegBase64FromUri(uri, 800, 0.55);
    }
    if (b64.length > MAX_B64_CHARS) {
      b64 = await jpegBase64FromUri(uri, 640, 0.45);
    }
    return { base64: b64, mime: 'image/jpeg' };
  } catch {
    const fallback = await getFileBase64(uri, inlineBase64);
    if (fallback.base64.length > MAX_B64_CHARS) {
      throw new Error(i18n.t('errors.aiImageTooHeavy'));
    }
    return { base64: fallback.base64, mime: 'image/jpeg' };
  }
}

function normalizeExtraction(raw: unknown): AIExtractionResult {
  const p = raw as Record<string, unknown>;
  const vatRaw = p.vat_details;
  let vat: VatDetail[] = [];
  if (Array.isArray(vatRaw)) {
    vat = vatRaw.map((x: Record<string, unknown>) => ({
      rate: Number(x?.rate) || 0,
      base: Number(x?.base) || 0,
      amount: Number(x?.amount) || 0,
    }));
  }
  if (vat.length === 0) {
    vat = [{ rate: 20, base: 0, amount: 0 }];
  }

  const ht = Number(p.amount_ht);
  const ttc = Number(p.amount_ttc);

  const cityRaw = typeof p.city === 'string' ? p.city.trim() : '';

  const cat = parseCategoryFromAi(p.category);

  return {
    date: typeof p.date === 'string' ? p.date : new Date().toISOString().slice(0, 10),
    supplier:
      typeof p.supplier === 'string' && p.supplier.trim()
        ? p.supplier
        : i18n.t('expense.unknownSupplier'),
    city: cityRaw,
    amount_ht: Number.isFinite(ht) ? ht : 0,
    amount_ttc: Number.isFinite(ttc) ? ttc : 0,
    vat_details: vat,
    confidence: Math.min(1, Math.max(0, Number(p.confidence) || 0.5)),
    ...(cat ? { category: cat } : {}),
  };
}

function parseAiJsonContent(content: string): AIExtractionResult {
  let raw = content.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) raw = fenced[1].trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(i18n.t('errors.aiResponseNoJson'));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(i18n.t('errors.aiResponseBadJson'));
  }

  return normalizeExtraction(parsed);
}

type EdgeExtractResponse = { content?: string; error?: string };

/**
 * Extraction via Edge Function Supabase `extract-receipt` (Gemini 2.5 Flash).
 * Clé : `supabase secrets set GEMINI_API_KEY=...` puis `supabase functions deploy extract-receipt`
 */
async function extractViaEdgeFunction(
  base64: string,
  mime: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<EdgeExtractResponse>(
    'extract-receipt',
    { body: { base64, mime } }
  );

  if (error) {
    throw new Error(error.message || i18n.t('errors.aiEdgeUnavailable'));
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  const content = data?.content ?? '';
  if (!content) {
    throw new Error(i18n.t('errors.aiEmptyAnalysisService'));
  }
  return content;
}

export const extractReceiptData = async (
  imageUri: string,
  inlineBase64?: string | null,
  options?: { mimeType?: string | null; fileName?: string | null }
): Promise<AIExtractionResult> => {
  const isPdf = isPdfReceipt(imageUri, options?.mimeType, options?.fileName);

  if (isPdf) {
    let content: string;
    if (Platform.OS === 'web') {
      try {
        const { base64, uri: jpegUri } = await pdfUriToJpegDataUri(imageUri);
        const { base64: prepared, mime } = await prepareImageForAi(jpegUri, base64);
        content = await extractViaEdgeFunction(prepared, mime);
      } catch {
        const pdfFile = await getFileBase64(imageUri, inlineBase64);
        if (pdfFile.base64.length > MAX_B64_CHARS) {
          throw new Error(i18n.t('errors.receiptFileTooLarge'));
        }
        content = await extractViaEdgeFunction(pdfFile.base64, 'application/pdf');
      }
    } else {
      const pdfFile = await getFileBase64(imageUri, inlineBase64);
      if (pdfFile.base64.length > MAX_B64_CHARS) {
        throw new Error(i18n.t('errors.receiptFileTooLarge'));
      }
      content = await extractViaEdgeFunction(pdfFile.base64, 'application/pdf');
    }
    return parseAiJsonContent(content);
  }

  const { base64, mime } = await prepareImageForAi(imageUri, inlineBase64);
  const content = await extractViaEdgeFunction(base64, mime);
  return parseAiJsonContent(content);
};
