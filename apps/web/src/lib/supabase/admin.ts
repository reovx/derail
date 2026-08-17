import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { Database } from "./types.generated";

/**
 * The service-role client. Bypasses RLS entirely.
 *
 * Ingest and the poller authenticate callers by project ingest token and by
 * cron secret respectively, not by a Supabase session, so neither has a user
 * to act as. `server-only` makes importing this from a client component a
 * build error rather than a leak.
 */

let client: SupabaseClient<Database> | null = null;

export function supabaseAdmin(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.",
    );
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
