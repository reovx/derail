"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { Database } from "./types.generated";

/**
 * The browser client, for Realtime only.
 *
 * Everything the page renders on first paint still comes from the server with
 * the service role — this exists so the timeline can *keep* itself current, not
 * so it can fetch itself. Reads through this client are governed by the anon
 * policies added in `20260820110000_public_projects_and_realtime.sql`, which
 * reach only rows under a project explicitly marked public.
 *
 * The publishable key is safe in the browser by design: it carries no
 * privileges of its own, and there are no write policies on any table, so a
 * client holding it cannot forge a deploy record.
 */

let client: SupabaseClient<Database> | null = null;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must both be set.");
    this.name = "SupabaseNotConfiguredError";
  }
}

/**
 * Returns null rather than throwing when the keys are absent. A missing
 * publishable key should cost the page its live updates, not its content —
 * the server already rendered every run.
 */
export function supabaseBrowser(): SupabaseClient<Database> | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    // The timeline is not a chat room. Ten events a second is far more than a
    // deploy stream produces, and it keeps a backfill burst from locking the
    // main thread re-rendering the list on every row.
    realtime: { params: { eventsPerSecond: 10 } },
  });

  return client;
}
