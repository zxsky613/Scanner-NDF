import { readAsStringAsync } from 'expo-file-system';
import { AI_API_URL, AI_API_KEY, AI_MODEL } from '../config/constants';
import { AIExtractionResult } from '../types';

export const extractReceiptData = async (imageUri: string): Promise<AIExtractionResult> => {
  if (!AI_API_KEY?.trim()) {
    throw new Error(
      'Clé Groq manquante : ajoutez EXPO_PUBLIC_GROQ_API_KEY dans .env (voir .env.example).'
    );
  }

  const base64 = await readAsStringAsync(imageUri, {
    encoding: 'base64',
  });

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
If you cannot read a field, use reasonable defaults. Date format must be YYYY-MM-DD.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the data from this receipt:' },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 500,
    }),
  });

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content ?? '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse AI response');
  }

  return JSON.parse(jsonMatch[0]) as AIExtractionResult;
};
