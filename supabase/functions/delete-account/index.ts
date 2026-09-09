import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  Response.json(body, {
    status,
    headers: corsHeaders,
  });

const getDefaultSecretKey = () => {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (secretKeys) {
    try {
      const parsedSecretKeys = JSON.parse(secretKeys) as Record<
        string,
        unknown
      >;
      return typeof parsedSecretKeys.default === "string"
        ? parsedSecretKeys.default
        : null;
    } catch {
      return null;
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
};

const getBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  return authorizationHeader.slice("Bearer ".length).trim();
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "DELETE") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseSecretKey = getDefaultSecretKey();

  if (!supabaseUrl || !supabaseSecretKey) {
    return jsonResponse({ error: "Account deletion is not configured" }, 500);
  }

  const token = getBearerToken(request.headers.get("Authorization"));

  if (!token) {
    return jsonResponse({ error: "Authentication is required" }, 401);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Authentication is invalid" }, 401);
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
    user.id,
  );

  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  return jsonResponse({ deleted: true }, 200);
});
