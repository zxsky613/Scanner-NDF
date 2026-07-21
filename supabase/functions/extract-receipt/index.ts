import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { base64?: string; mime?: string };
    const base64 = body?.base64;
    const mime = body?.mime;
    if (!base64 || typeof base64 !== "string") {
      return new Response(JSON.stringify({ error: "Missing base64 image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          error:
            "GEMINI_API_KEY not set on project (supabase secrets set GEMINI_API_KEY=...)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isPdf =
      typeof mime === "string" &&
      (mime === "application/pdf" || mime === "application/x-pdf");

    const parts: GeminiPart[] = [{ text: SYSTEM_PROMPT }];

    if (isPdf) {
      let pdfText: string;
      try {
        pdfText = await pdfBase64ToText(base64);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(
          JSON.stringify({ error: `PDF read failed: ${msg}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (pdfText.length < 12) {
        return new Response(
          JSON.stringify({
            error:
              "PDF without readable text (scanned image). Use a photo or a digital PDF receipt.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      parts.push({
        text: `Extract the data from this receipt text:\n\n${pdfText}`,
      });
    } else {
      const safeMime =
        typeof mime === "string" && /^image\/[\w.+-]+$/.test(mime)
          ? mime
          : "image/jpeg";

      parts.push({ text: "Extract the data from this receipt:" });
      parts.push({
        inline_data: {
          mime_type: safeMime,
          data: base64,
        },
      });
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(geminiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    const geminiJson = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };

    if (!geminiRes.ok) {
      const msg =
        geminiJson?.error?.message ??
        geminiRes.statusText ??
        JSON.stringify(geminiJson);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = extractGeminiText(geminiJson);
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty response from Gemini" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
