import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** gemini-2.5-flash = 404 pour nouveaux comptes ; *-latest reste dispo. */
const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
] as const;

const SYSTEM_PROMPT = `You are a receipt data extraction assistant. Extract the following from the receipt and return ONLY valid JSON:
{
  "date": "YYYY-MM-DD",
  "supplier": "string",
  "city": "string",
  "amount_ht": number (amount excluding tax),
  "amount_ttc": number (total amount including tax),
  "vat_details": [{"rate": number, "base": number, "amount": number}],
  "category": "food" | "materials" | "travel" | "lodging" | "equipment_rental" | "local_procurement" | "other",
  "confidence": number (0-1)
}
Classify "category" as exactly one lowercase key:
food (meals, restaurants), materials (supplies, hardware), travel (fuel, taxi, train, flights, parking),
lodging (hotels, accommodation, 住宿), equipment_rental (renting tools/equipment, 设备租赁, location matériel),
local_procurement (local purchases on behalf of equipment suppliers, 替设备商本地代采), other (else).
Use merchant name, store header, or restaurant name as supplier if visible; otherwise "Inconnu".
For "city": city name where purchase occurred from address/footer on ticket; if unknown use "".
Sum line items for a total if no grand total visible. If you cannot read a field, use reasonable defaults. Date format must be YYYY-MM-DD.`;

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function pdfBase64ToText(pdfBase64: string): Promise<string> {
  const binary = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const pdf = await getDocumentProxy(binary);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}

function extractGeminiText(json: {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}): string {
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("").trim();
}

function stripDataUrl(b64: string): string {
  const m = b64.match(/^data:[^;]+;base64,(.+)$/i);
  return m ? m[1] : b64;
}

function normalizeMime(mime: string | undefined, isPdf: boolean): string {
  if (isPdf) return "application/pdf";
  if (!mime) return "image/jpeg";
  const m = mime.toLowerCase().trim();
  // HEIC souvent rejeté par Gemini → on tente jpeg (après conversion côté app)
  if (m.includes("heic") || m.includes("heif")) return "image/jpeg";
  if (/^image\/[\w.+-]+$/.test(m)) return m;
  return "image/jpeg";
}

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGemini(
  apiKey: string,
  model: string,
  parts: GeminiPart[]
): Promise<{ ok: boolean; status: number; json: Record<string, unknown>; text: string }> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const geminiBody = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  let res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: geminiBody,
  });

  if (res.status === 401 || res.status === 403) {
    res = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: geminiBody,
    });
  }

  const json = (await res.json()) as Record<string, unknown>;
  const text = extractGeminiText(
    json as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }
  );
  return { ok: res.ok, status: res.status, json, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return jsonError("Unauthorized", 401);
    }

    const body = (await req.json()) as {
      base64?: string;
      imageBase64?: string;
      mime?: string;
    };
    let base64 = body?.base64 ?? body?.imageBase64;
    const mime = body?.mime;
    if (!base64 || typeof base64 !== "string") {
      return jsonError("Missing base64 image");
    }

    base64 = stripDataUrl(base64).replace(/\s/g, "");

    // ~7.5 Mo binaire — les photos iPhone compressées passent ; au-delà Gemini / gateway saturent
    if (base64.length > 10_000_000) {
      return jsonError("Image too large for analysis. Use a smaller photo.");
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!geminiKey) {
      return jsonError(
        "GEMINI_API_KEY not set on project (supabase secrets set GEMINI_API_KEY=...)",
        500
      );
    }

    const isPdf =
      typeof mime === "string" &&
      (mime === "application/pdf" || mime === "application/x-pdf");

    const parts: GeminiPart[] = [{ text: SYSTEM_PROMPT }];

    if (isPdf) {
      let pdfText = "";
      try {
        pdfText = await pdfBase64ToText(base64);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("PDF text extract failed:", msg);
      }

      if (pdfText.length >= 12) {
        parts.push({
          text: `Extract the data from this receipt text:\n\n${pdfText}`,
        });
      } else {
        parts.push({
          text:
            "The PDF may be scanned. Extract the receipt data with OCR and return ONLY valid JSON.",
        });
        parts.push({
          inline_data: { mime_type: "application/pdf", data: base64 },
        });
      }
    } else {
      const safeMime = normalizeMime(
        typeof mime === "string" ? mime : undefined,
        false
      );
      console.log(
        `extract-receipt user=${user.id} mime=${safeMime} b64Len=${base64.length}`
      );
      parts.push({ text: "Extract the data from this receipt:" });
      parts.push({
        inline_data: {
          mime_type: safeMime,
          data: base64,
        },
      });
    }

    let lastErr = "Gemini failed";
    for (const model of GEMINI_MODELS) {
      const result = await callGemini(geminiKey, model, parts);
      if (result.ok && result.text) {
        return new Response(JSON.stringify({ content: result.text }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errObj = result.json?.error as { message?: string } | undefined;
      lastErr =
        errObj?.message ??
        (result.text ? "Empty structured output" : `HTTP ${result.status}`);
      console.error(`Gemini ${model}:`, result.status, lastErr);

      // 404 modèle → essayer le suivant ; autres erreurs → suivant aussi (lite puis flash)
      if (result.status === 401 || result.status === 403) {
        return jsonError(`Gemini (${result.status}): ${lastErr}`, 502);
      }
    }

    return jsonError(`Gemini: ${lastErr}`, 502);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("extract-receipt crash:", msg);
    return jsonError(msg, 500);
  }
});
