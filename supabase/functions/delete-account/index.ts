import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "SERVER_MISCONFIGURED" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const uid = user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: clearReviewerErr } = await admin
      .from("expenses")
      .update({ reviewed_by: null })
      .eq("reviewed_by", uid);

    if (clearReviewerErr) {
      return jsonResponse(
        { error: clearReviewerErr.message ?? "CLEAR_REVIEWER_FAILED" },
        400
      );
    }

    const receiptBucket = "receipts";
    const { data: files, error: listErr } = await admin.storage
      .from(receiptBucket)
      .list(uid, { limit: 1000 });

    if (!listErr && files?.length) {
      const paths = files.map((f) => `${uid}/${f.name}`);
      const { error: rmErr } = await admin.storage.from(receiptBucket).remove(paths);
      if (rmErr) {
        console.warn("delete-account: storage remove partial", rmErr);
      }
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(uid);
    if (deleteErr) {
      return jsonResponse(
        { error: deleteErr.message ?? "AUTH_DELETE_FAILED" },
        400
      );
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse(
      { error: e instanceof Error ? e.message : String(e) },
      500
    );
  }
});
