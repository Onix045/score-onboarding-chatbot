import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Server-only service-role client. Never import this from a "use client"
 * file — the service-role key must never reach the browser bundle.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("SUPABASE_URL is not set");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
