-- Indexes for sifting a large run history — `SPEC-UI-UX.md` §5.2.
--
-- Purely additive: no table, column or policy changes, so the generated types
-- and every existing query are untouched. Applying this changes nothing about
-- what the app returns; it changes how long it takes to return it.
--
-- The list screen issues four shapes of query, and before this migration three
-- of them are sequential scans as soon as the table stops being small:
--
--   1. a page      — project + filters, ordered by started_at desc, limit/offset
--   2. four counts — project + filters, grouped by the status being counted
--   3. a search    — ilike '%term%' across five text columns
--   4. facets      — the most recent N branches / identities / environments
--
-- (1), (2) and (4) are answered by the composite btree indexes below. (3) needs
-- trigrams: a leading wildcard makes a btree index useless, which is exactly the
-- search a developer types when they remember four characters of a branch name.

create extension if not exists pg_trgm;

-- (1) and (4). `command_runs_project_started_idx` already covers the unfiltered
-- page; this one covers the same page with a status filter applied, which is
-- the single most common thing anyone does on this screen — the four tally
-- cells are that filter.
create index if not exists command_runs_project_status_started_idx
  on public.command_runs (project_id, status, started_at desc);

-- Filtering by branch or identity, then ordering by time. Both are low
-- cardinality against a project's history, so the leading columns stay
-- selective and the third column keeps the sort off the query plan.
create index if not exists command_runs_project_branch_started_idx
  on public.command_runs (project_id, branch, started_at desc)
  where branch is not null;

create index if not exists command_runs_project_actor_started_idx
  on public.command_runs (project_id, actor, started_at desc)
  where actor is not null;

-- Sorting by how long a run took. `duration_ms` is null while a run is still
-- in flight and those rows are never what "slowest first" is asking for, so the
-- index excludes them and stays smaller than the table.
create index if not exists command_runs_project_duration_idx
  on public.command_runs (project_id, duration_ms desc)
  where duration_ms is not null;

-- (3). One GIN index per searched column. Trigram indexes support `ilike` with
-- wildcards on both sides, which is what makes "type four characters of a
-- commit sha" fast rather than a table scan.
--
-- `argv` is deliberately absent: it is searched by exact array containment
-- (`argv @> '{release}'`), which is what finds a contract function name, and
-- the array is small enough that the row filter is cheap once the project and
-- time predicates have already narrowed the set.
create index if not exists command_runs_command_trgm_idx
  on public.command_runs using gin (command gin_trgm_ops);

create index if not exists command_runs_branch_trgm_idx
  on public.command_runs using gin (branch gin_trgm_ops);

create index if not exists command_runs_actor_trgm_idx
  on public.command_runs using gin (actor gin_trgm_ops);

create index if not exists command_runs_commit_trgm_idx
  on public.command_runs using gin (commit_sha gin_trgm_ops);

-- The detail page reads a run's transactions by run id and orders them by seq.
-- There is a unique constraint on (command_run_id, seq) that already serves it,
-- but the list's per-page transaction count reads `command_run_id in (...)` and
-- that wants its own index rather than the unique index's leading column alone.
create index if not exists chain_transactions_run_idx
  on public.chain_transactions (command_run_id);
