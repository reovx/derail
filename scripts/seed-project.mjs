/**
 * Seeds the first project and issues its ingest token.
 *
 * `SPEC-MVP1.md` §2 cuts the projects UI for MVP 1: one project, seeded, token
 * held by the developer. A migration cannot do this job, because the token has
 * to be generated, shown exactly once, and stored only as a hash.
 *
 *   node --env-file=apps/web/.env.local scripts/seed-project.mjs \
 *     --email you@example.com --name derail
 *
 * Pass --rotate to issue a new token for an existing project. The old one
 * stops working immediately.
 */

import { createHash, randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string", default: "derail" },
    rotate: { type: "boolean", default: false },
  },
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n" +
      "Run with: node --env-file=apps/web/.env.local scripts/seed-project.mjs --email you@example.com",
  );
  process.exit(1);
}

if (!values.email) {
  console.error("Pass the owner's email: --email you@example.com");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * The owner is created by email rather than waiting on GitHub OAuth, so the
 * ingest path is not blocked behind it. Signing in with GitHub using this same
 * address later links to this user rather than creating a second one.
 */
async function findOrCreateOwner(email) {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw new Error(`Could not list users: ${listError.message}`);

  const existing = list.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw new Error(`Could not create the owner: ${error.message}`);
  return data.user;
}

function issueToken() {
  // Prefixed so it is recognisable in a shell history or a CI log, and long
  // enough that guessing it is not a strategy.
  const token = `drl_${randomBytes(32).toString("hex")}`;
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

function report(token, project) {
  console.log(`\n  Project   ${project.name}`);
  console.log(`  Id        ${project.id}`);
  console.log(`  Token     ${token}`);
  console.log("\n  This is the only time the token is shown — only its hash is stored.");
  console.log("  Give it to the wrapper:\n");
  console.log(`    export DERAIL_TOKEN=${token}\n`);
}

const owner = await findOrCreateOwner(values.email);

const { data: existing, error: lookupError } = await supabase
  .from("projects")
  .select("id, name")
  .eq("owner_id", owner.id)
  .eq("name", values.name)
  .maybeSingle();

if (lookupError) {
  console.error(`Could not read projects: ${lookupError.message}`);
  process.exit(1);
}

if (existing && !values.rotate) {
  console.log(`\n  Project "${existing.name}" already exists (${existing.id}).`);
  console.log("  Its token was shown once at creation and cannot be recovered.");
  console.log("  Run again with --rotate to issue a new one.\n");
  process.exit(0);
}

const { token, hash } = issueToken();

if (existing) {
  const { error } = await supabase
    .from("projects")
    .update({ ingest_token_hash: hash })
    .eq("id", existing.id);

  if (error) {
    console.error(`Could not rotate the token: ${error.message}`);
    process.exit(1);
  }
  report(token, existing);
} else {
  const { data, error } = await supabase
    .from("projects")
    .insert({ owner_id: owner.id, name: values.name, ingest_token_hash: hash })
    .select("id, name")
    .single();

  if (error) {
    console.error(`Could not create the project: ${error.message}`);
    process.exit(1);
  }
  report(token, data);
}
