import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "./env.js";

export function getSupabaseAdmin() {
  return createClient(
    getRequiredEnv("VITE_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function requireSupabaseUser(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const supabase = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("UNAUTHORIZED");
  }

  return { supabase, user };
}
