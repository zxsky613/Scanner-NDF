import { readAsStringAsync } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { AI_API_URL, AI_API_KEY, AI_MODEL } from '../config/constants';
import { AIExtractionResult, VatDetail } from '../types';

/** Groq limite ~4 Mo pour les requêtes base64 ; on reste largement en dessous. */
const MAX_B64_CHARS = 3_000_000;

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
      throw new Error(`Impossible de lire l'image (web): ${res.status}`);
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
      throw new Error(
        "Image trop lourde pour l'analyse. Reprenez la photo plus près du ticket."
      );
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

  return {
    date: typeof p.date === 'string' ? p.date : new Date().toISOString().slice(0, 10),
    supplier: typeof p.supplier === 'string' && p.supplier.trim() ? p.supplier : 'Inconnu',
    amount_ht: Number.isFinite(ht) ? ht : 0,
    amount_ttc: Number.isFinite(ttc) ? ttc : 0,
    vat_details: vat,
    confidence: Math.min(1, Math.max(0, Number(p.confidence) || 0.5)),
  };
}

function parseAiJsonContent(content: string): AIExtractionResult {
  let raw = content.trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) raw = fenced[1].trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Réponse IA illisible (pas de JSON).');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Réponse IA invalide (JSON cassé).');
  }

  return normalizeExtraction(parsed);
}

export const extractReceiptData = async (
  imageUri: string,
  inlineBase64?: string | null
): Promise<AIExtractionResult> => {
  if (!AI_API_KEY?.trim()) {
    throw new Error(
      'Clé Groq manquante : ajoutez EXPO_PUBLIC_GROQ_API_KEY dans .env (voir .env.example).'
    );
  }

  const { base64, mime } = await prepareImageForGroq(imageUri, inlineBase64);

  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a receipt data extraction assistant. Extract the following from the receipt image and return ONLY valid JSON:
{
  "date": "YYYY-MM-DD",
  "supplier": "string",
  "amount_ht": number (amount excluding tax),
  "amount_ttc": number (total amount including tax),
  "vat_details": [{"rate": number, "base": number, "amount": number}],
  "confidence": number (0-1)
}
Use merchant name, store header, or restaurant name as supplier if visible; otherwise "Inconnu". Sum line items for a total if no grand total visible. If you cannot read a field, use reasonable defaults. Date format must be YYYY-MM-DD.`,
        },
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
      max_tokens: 700,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    const msg = result?.error?.message ?? response.statusText ?? JSON.stringify(result);
    throw new Error(msg);
  }

  const content = result.choices?.[0]?.message?.content ?? '';
  if (!content) {
    throw new Error('Réponse vide du modèle.');
  }

  return parseAiJsonContent(content);
};
