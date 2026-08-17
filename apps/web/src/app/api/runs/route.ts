import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { validateIngestPayload } from "@/lib/ingest/payload";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/types.generated";

export const runtime = "nodejs";
/** Every request writes; nothing here is cacheable. */
export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";
const NOT_NULL_VIOLATION = "23502";

function unauthorized() {
  return NextResponse.json(
    { error: "Provide a project ingest token as `Authorization: Bearer <token>`." },
    { status: 401 },
  );
}

/**
 * POST /api/runs — SPEC-MVP1.md §5.
 *
 * Upsert on idempotency_key. The wrapper calls this twice with the same key,
 * which buys three properties at once: a crashed run still leaves a record, a
 * failed first call is repaired by the second, and a network retry is safe.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return unauthorized();

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return unauthorized();

  // The token is never stored, so authentication is a lookup by its hash.
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const supabase = supabaseAdmin();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("ingest_token_hash", tokenHash)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json({ error: "Could not verify the token." }, { status: 500 });
  }
  if (!project) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  const validation = validateIngestPayload(body);
  if (!validation.ok) {
    return NextResponse.json({ error: "Invalid payload.", details: validation.errors }, { status: 400 });
  }

  const { tx_hashes: txHashes, ...run } = validation.value;

  // Only fields the caller actually sent are written, so the exit call cannot
  // blank out what the spawn call recorded.
  const fields = Object.fromEntries(
    Object.entries(run).filter(([, value]) => value !== undefined),
  ) as TablesUpdate<"command_runs">;

  const insert = {
    ...fields,
    project_id: project.id,
    idempotency_key: run.idempotency_key,
    status: run.status,
  } as TablesInsert<"command_runs">;

  // Scoped to this project, so one project cannot write over another's run by
  // guessing its key.
  const update = async () =>
    supabase
      .from("command_runs")
      .update(fields)
      .eq("idempotency_key", run.idempotency_key)
      .eq("project_id", project.id)
      .select("id")
      .maybeSingle();

  // Look before inserting rather than inserting and catching the conflict:
  // Postgres checks NOT NULL before the unique index, so a second call
  // carrying only the exit fields would fail as a missing `command` and never
  // reach the conflict path at all.
  const existing = await supabase
    .from("command_runs")
    .select("id")
    .eq("idempotency_key", run.idempotency_key)
    .eq("project_id", project.id)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json({ error: "Could not read the run." }, { status: 500 });
  }

  let runId: string | null = null;

  if (existing.data) {
    const updated = await update();
    if (updated.error || !updated.data) {
      return NextResponse.json({ error: "Could not update the run." }, { status: 500 });
    }
    runId = updated.data.id;
  } else {
    const inserted = await supabase.from("command_runs").insert(insert).select("id").maybeSingle();

    if (inserted.error?.code === UNIQUE_VIOLATION) {
      // The row appeared between the select and the insert — either a
      // concurrent call for the same run, or the key belongs to another
      // project. The scoped update tells the two apart.
      const updated = await update();
      if (updated.error) {
        return NextResponse.json({ error: "Could not update the run." }, { status: 500 });
      }
      if (!updated.data) {
        return NextResponse.json(
          { error: "That idempotency key belongs to another project." },
          { status: 409 },
        );
      }
      runId = updated.data.id;
    } else if (inserted.error) {
      if (inserted.error.code === NOT_NULL_VIOLATION) {
        return NextResponse.json(
          { error: "The first call for a run must include `command`." },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Could not record the run." }, { status: 500 });
    } else {
      runId = inserted.data?.id ?? null;
    }
  }

  if (!runId) {
    return NextResponse.json({ error: "Could not record the run." }, { status: 500 });
  }

  // §3.4 — one command can produce several transactions, and `seq` is their
  // order in the stream. Re-posting the same hashes is a no-op.
  if (txHashes?.length) {
    const rows: TablesInsert<"chain_transactions">[] = txHashes.map((tx_hash, index) => ({
      command_run_id: runId,
      seq: index + 1,
      tx_hash,
    }));

    const { error: txError } = await supabase
      .from("chain_transactions")
      .upsert(rows, { onConflict: "tx_hash", ignoreDuplicates: true });

    if (txError) {
      return NextResponse.json(
        { id: runId, status: run.status, warning: "Run recorded; transactions were not." },
        { status: 207 },
      );
    }
  }

  return NextResponse.json({ id: runId, status: run.status }, { status: 200 });
}
