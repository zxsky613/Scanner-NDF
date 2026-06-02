import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `You are a receipt data extraction assistant. Extract the following from the receipt image and return ONLY valid JSON:
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

    const groqKey = Deno.env.get("GROQ_API_KEY")?.trim();
    if (!groqKey) {
      return new Response(
        JSON.stringify({
          error:
            "GROQ_API_KEY not set on project (supabase secrets set GROQ_API_KEY=...)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const safeMime =
      typeof mime === "string" && /^image\/[\w.+-]+$/.test(mime)
        ? mime
        : "image/jpeg";

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the data from this receipt:" },
              {
                type: "image_url",
                image_url: { url: `data:${safeMime};base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 850,
      }),
    });

    const groqJson = (await groqRes.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!groqRes.ok) {
      const msg =
        groqJson?.error?.message ??
        groqRes.statusText ??
        JSON.stringify(groqJson);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = groqJson?.choices?.[0]?.message?.content ?? "";
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
