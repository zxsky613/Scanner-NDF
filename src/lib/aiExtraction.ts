import * as ImageManipulator from 'expo-image-manipulator';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { AI_API_URL, AI_API_KEY, AI_MODEL } from '../config/constants';
import { supabase } from '../config/supabase';
import i18n from '../i18n';
import {
  AIExtractionResult,
  ExpenseCategory,
  EXPENSE_CATEGORY_KEYS,
  VatDetail,
} from '../types';

/** Groq limite ~4 Mo pour les requêtes base64 ; on reste largement en dessous. */
const MAX_B64_CHARS = 3_000_000;

const CATEGORY_PROMPT_LINES = `
Also classify the expense into exactly one "category" string (must be one of these lowercase keys):
- food: meals, restaurants, cafés, groceries for meals
- materials: supplies, hardware, raw materials, consumables
- travel: fuel, taxis, trains, flights, parking, mileage, public transport for business trips
- lodging: accommodation, hotels, hostels, 住宿 (nights, room charges)
- equipment_rental: renting tools or equipment, location de matériel, 设备租赁
- other: anything that does not clearly fit above
`.trim();

const SYSTEM_PROMPT = `You are a receipt data extraction assistant. Extract the following from the receipt image and return ONLY valid JSON:
{
  "date": "YYYY-MM-DD",
  "supplier": "string",
  "city": "string",
  "amount_ht": number (amount excluding tax),
  "amount_ttc": number (total amount including tax),
  "vat_details": [{"rate": number, "base": number, "amount": number}],
  "category": "food" | "materials" | "travel" | "lodging" | "equipment_rental" | "other",
  "confidence": number (0-1)
}
${CATEGORY_PROMPT_LINES}
Use merchant name, store header, or restaurant name as supplier if visible; otherwise "Inconnu".
For "city": the city name where the purchase took place — infer from the address block, store footer, or postal line on the ticket (e.g. "Paris", "Lyon"). If no city is visible or inferable, use an empty string "".
Sum line items for a total if no grand total visible. If you cannot read a field, use reasonable defaults. Date format must be YYYY-MM-DD.`;

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
async function getImageBase64(
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

/**
 * Groq refuse les images trop lourdes en base64. Redimensionnement + JPEG avant envoi.
 */
async function prepareImageForGroq(
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
    const fallback = await getImageBase64(uri, inlineBase64);
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
 * Sur le web, l’API Groq est en général bloquée par CORS : appel à la Edge Function `extract-receipt`.
 * Déployer : `supabase secrets set GROQ_API_KEY=gsk_...` puis `supabase functions deploy extract-receipt`
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
  inlineBase64?: string | null
): Promise<AIExtractionResult> => {
  /* Sur iOS/Android la clé est utilisée en direct ; sur le web, Groq passe par Supabase (secret GROQ_API_KEY). */
  if (Platform.OS !== 'web' && !AI_API_KEY?.trim()) {
    throw new Error(i18n.t('errors.aiGroqKeyMissing'));
  }

  const { base64, mime } = await prepareImageForGroq(imageUri, inlineBase64);

  let content: string;

  if (Platform.OS === 'web') {
    content = await extractViaEdgeFunction(base64, mime);
  } else {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the data from this receipt:' },
              {
                type: 'image_url',
                image_url: { url: `data:${mime};base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 850,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const msg = result?.error?.message ?? response.statusText ?? JSON.stringify(result);
      throw new Error(msg);
    }

    content = result.choices?.[0]?.message?.content ?? '';
    if (!content) {
      throw new Error(i18n.t('errors.aiEmptyModelResponse'));
    }
  }

  return parseAiJsonContent(content);
};
