# spec.md

## Project
Soroban Deploy-to-Chain Observability Platform

## One-Line Summary
A deploy-to-chain observability platform for Soroban teams that connects CLI commands, CI/CD runs, simulation output, submitted transactions, and final on-chain outcomes in one searchable timeline.

---

## Product Goal
Build a developer-facing platform that helps Soroban teams understand, trace, and debug deployments and contract invocations across the full lifecycle:

1. local or CI command execution
2. simulation output
3. transaction submission
4. ledger confirmation
5. emitted contract events
6. alerts and incident review

The platform should make it easy to answer:
- what was deployed
- who deployed it
- from which repo/branch/commit
- with what command and parameters
- what simulation predicted
- what actually happened on-chain
- whether the deploy or invocation failed
- what changed before an incident

---

## Core Product Positioning
This is not a generic explorer.
This is not a generic log viewer.
This is not a generic alerting dashboard.

This product is:
- release-centric
- deploy-centric
- invocation-centric
- built specifically for Soroban developer workflows

Primary differentiator:
- correlation between Soroban CLI usage, CI/CD logs, simulation results, and final on-chain outcomes

---

## Primary Users
- Soroban smart contract teams
- Stellar app teams using Soroban
- DevOps/platform engineers supporting Soroban deployments
- protocol teams
- security-conscious teams needing deployment audit trails

---

## MVP Scope
The MVP must support the following:

### Inputs
- Soroban CLI wrapper
- GitHub Actions integration
- manual transaction hash ingestion fallback

### Captured Metadata
- workspace/project name
- environment
- network
- actor/user/service
- repo URL
- branch
- commit SHA
- CI provider
- pipeline/job/run ID
- command executed
- command arguments
- stdout/stderr excerpts
- simulation result summary
- transaction hash
- submission timestamp
- final transaction status
- ledger number
- contract ID if available
- emitted events if available

### Outputs
- deploy timeline
- invocation timeline
- searchable run history
- transaction detail view
- simulation vs final outcome comparison
- failure alerts to Slack
- basic incident history

---

## Non-Goals for MVP
Do not build these in v1 unless explicitly required later:
- full multi-chain support
- generic blockchain observability
- advanced anomaly detection
- role-based enterprise permissions
- full audit/compliance suite
- custom event ABI decoding for every contract type
- GitLab, CircleCI, Jenkins support
- production-grade billing
- mobile app
- complex incident management workflows
- rollback automation
- auto-remediation

---

## User Stories

### Deployment Traceability
As a Soroban developer,
I want to see every deployment tied to a repo, branch, commit, command, and tx hash,
so that I can understand exactly what was released.

### Invocation Debugging
As a developer,
I want to compare simulation output with final on-chain results,
so that I can debug failed or unexpected invocations.

### CI/CD Visibility
As a platform engineer,
I want GitHub Actions runs to be linked to Soroban transactions,
so that I can trace failures from pipeline to chain.

### Incident Review
As a team lead,
I want a timeline of failed deploys and invocations,
so that I can quickly identify what changed before an issue.

### Alerting
As an operator,
I want Slack alerts when deploys or invocations fail,
so that I can respond quickly.

---

## Functional Requirements

### 1. Authentication and Workspaces
The system must:
- support user authentication
- support multiple workspaces
- allow projects to belong to a workspace

For MVP, simple email/password or GitHub auth is acceptable.

### 2. Project Management
Users must be able to:
- create a project
- attach repo metadata
- define environment labels such as dev, staging, prod
- define network such as testnet or mainnet

### 3. CLI Instrumentation
Provide a Soroban CLI wrapper or helper that:
- captures command name
- captures arguments
- captures timestamps
- captures stdout/stderr excerpts
- captures exit code
- captures simulation summary if present
- captures tx hash if present
- sends metadata to the backend

The wrapper should be simple to install and use.

Preferred UX:
- a thin wrapper command
- or a shell-compatible helper script

### 4. GitHub Actions Integration
Provide a GitHub Actions integration that:
- captures workflow metadata
- captures repo, branch, commit SHA
- captures job/run identifiers
- captures relevant logs or excerpts
- captures tx hash if produced
- sends metadata to backend
- links CI runs to command runs where possible

### 5. Manual Transaction Ingestion
Users must be able to manually submit:
- tx hash
- project/environment
- optional notes

This is a fallback for cases where wrapper/integration is not used.

### 6. Ingestion API
Backend must expose endpoints to ingest:
- command run metadata
- CI run metadata
- simulation summaries
- tx hashes
- log excerpts

The API must:
- validate payloads
- authenticate requests
- store correlation identifiers
- return stable IDs for created records

### 7. Correlation Engine
The system must correlate:
- command runs
- CI runs
- simulation results
- tx hashes
- final on-chain transaction outcomes
- contract events

The correlation engine should:
- poll Stellar/Soroban RPC for tx status
- fetch ledger confirmation details
- fetch related events where possible
- update records asynchronously
- retry pending transactions
- mark unresolved transactions after timeout

### 8. Simulation vs Final Outcome Comparison
The system must display:
- simulation success/failure
- final submission success/failure
- mismatch indicators

Examples:
- simulation succeeded, chain failed
- simulation failed, submission still attempted
- simulation output differs from final result

For MVP, a summary-level comparison is enough.
Deep semantic diffing is not required initially.

### 9. Dashboard
The UI must provide:
- recent deploys
- recent invocations
- status badges
- environment filter
- project filter
- network filter
- search by tx hash, contract ID, commit SHA, branch, actor

### 10. Timeline View
Each deploy/invocation record should show a timeline:
- command started
- simulation completed
- tx submitted
- tx confirmed or failed
- events observed
- alert sent if applicable

### 11. Alerts
For MVP, support Slack alerts for:
- deploy failed
- invocation failed
- tx pending too long
- simulation success but final chain failure

Alerts should include:
- project
- environment
- actor if known
- commit SHA if known
- tx hash
- failure summary
- link to dashboard record

### 12. Incident History
The system should maintain a simple incident/event feed showing:
- failed deploys
- failed invocations
- pending timeout cases
- alert delivery status

This can be a filtered activity feed in MVP.

---

## Technical Requirements

### Frontend
Preferred:
- Next.js
- TypeScript
- Tailwind or equivalent component styling
- server/client rendering as appropriate

### Backend
Preferred:
- Node.js
- TypeScript
- modular service architecture
- REST API for MVP

### Database
Preferred:
- PostgreSQL

### Queue / Async Jobs
Preferred:
- Redis + BullMQ
or equivalent lightweight job queue

### Notifications
Preferred:
- Slack webhook integration for MVP

### Hosting
Can be designed for:
- Vercel for frontend
- Railway / Fly.io / Render / AWS for backend and workers
Exact deployment target can remain flexible.

---

## Suggested System Architecture

### Components
1. Frontend dashboard
2. Backend API
3. Ingestion API
4. Correlation worker
5. Alert worker
6. PostgreSQL database
7. Redis queue
8. Slack notifier
9. Soroban CLI wrapper
10. GitHub Actions integration

### Data Flow
1. user runs Soroban command locally or in GitHub Actions
2. wrapper/integration captures metadata
3. ingestion API stores command run and tx hash
4. correlation worker polls chain for final outcome
5. worker stores tx result and events
6. alert worker evaluates failure conditions
7. dashboard renders unified timeline

---

## Data Model

### users
- id
- email
- name
- auth_provider
- created_at
- updated_at

### workspaces
- id
- name
- created_at
- updated_at

### workspace_members
- id
- workspace_id
- user_id
- role
- created_at

### projects
- id
- workspace_id
- name
- repo_url
- default_branch
- created_at
- updated_at

### environments
- id
- project_id
- name
- network
- created_at
- updated_at

### ci_runs
- id
- project_id
- environment_id
- provider
- repo_url
- branch
- commit_sha
- workflow_name
- job_name
- run_id
- run_url
- actor
- status
- started_at
- finished_at
- raw_metadata_json
- created_at
- updated_at

### command_runs
- id
- project_id
- environment_id
- ci_run_id nullable
- actor
- source_type
- command
- args_json
- stdout_excerpt
- stderr_excerpt
- exit_code
- started_at
- finished_at
- branch
- commit_sha
- repo_url
- simulation_status
- raw_metadata_json
- created_at
- updated_at

### simulations
- id
- command_run_id
- success
- summary_json
- raw_output_json
- created_at
- updated_at

### chain_transactions
- id
- command_run_id
- tx_hash
- status
- network
- ledger nullable
- contract_id nullable
- submitted_at nullable
- confirmed_at nullable
- result_summary
- result_xdr nullable
- raw_response_json
- created_at
- updated_at

### contract_events
- id
- chain_transaction_id
- contract_id
- ledger
- topic
- payload_json
- raw_event_json
- created_at

### alerts
- id
- workspace_id
- project_id nullable
- environment_id nullable
- type
- severity
- status
- channel
- payload_json
- delivered_at nullable
- created_at
- updated_at

### activity_feed
- id
- workspace_id
- project_id nullable
- environment_id nullable
- entity_type
- entity_id
- event_type
- summary
- payload_json
- created_at

---

## API Requirements

### Auth
- login
- logout
- current user

### Projects
- create project
- list projects
- get project
- update project

### Environments
- create environment
- list environments by project

### Ingestion
- create command run
- attach simulation result
- attach tx hash
- create CI run
- update CI run status

### Observability
- list deploys/invocations
- get deploy/invocation detail
- search records
- list activity feed
- list alerts

### Integrations
- create Slack webhook config
- test Slack webhook

Do not over-engineer the API in v1.
Keep it clean and practical.

---

## CLI Wrapper Requirements

### Goals
The wrapper should be easy to adopt and minimally invasive.

### Responsibilities
- execute Soroban CLI command
- capture command and args
- capture timestamps
- capture stdout/stderr
- detect tx hash if present
- optionally capture simulation output
- send structured payload to ingestion API
- preserve original command behavior as much as possible

### Constraints
- do not require major workflow changes
- do not break existing scripts
- should work in local and CI environments

### Nice-to-have
- environment variables for auth/config
- dry-run mode for testing
- debug logging

---

## GitHub Actions Integration Requirements

### Must support
- repo metadata
- branch
- commit SHA
- actor
- workflow/job/run identifiers
- run URL
- command run linkage
- tx hash submission
- status updates

### Delivery options
Accept either:
- a reusable GitHub Action
- or a documented script-based integration

Priority is simplicity and reliability.

---

## UI Requirements

### Main Views
1. Login / onboarding
2. Workspace dashboard
3. Project detail page
4. Deploy/invocation list
5. Deploy/invocation detail page
6. Alerts/activity feed
7. Integration settings

### Dashboard Widgets
- recent deploys
- recent failed invocations
- pending transactions
- success/failure counts
- by environment
- by project

### Detail Page
Must show:
- project/environment
- actor
- repo/branch/commit
- command and args
- simulation summary
- tx hash
- final status
- ledger
- contract ID if available
- event list
- alert history
- timeline

---

## Search and Filtering
Users should be able to filter by:
- project
- environment
- network
- status
- actor
- branch
- commit SHA
- tx hash
- contract ID
- date range

---

## Alerting Rules for MVP
Hardcode or configure simple rules for:
- deploy failed
- invocation failed
- tx pending beyond threshold
- simulation success but final failure

Do not build a full custom rules engine in MVP.

---

## Reliability Requirements
- ingestion should be idempotent where possible
- tx polling should retry with backoff
- duplicate tx hashes should not create broken state
- failed alert deliveries should be recorded
- logs/excerpts should be size-limited
- system should degrade gracefully if chain polling is delayed

---

## Security Requirements
- authenticate all ingestion endpoints
- protect workspace data boundaries
- avoid storing secrets in plaintext
- redact sensitive tokens from logs where possible
- validate webhook destinations
- use signed or token-based integration auth

---

## Observability for the Product Itself
The platform should also expose internal logs/metrics for:
- ingestion failures
- polling failures
- alert delivery failures
- queue backlog
- API latency

Keep this lightweight in MVP.

---

## Acceptance Criteria for MVP

### A. Project Setup
- user can create workspace and project
- user can define at least one environment

### B. CLI Ingestion
- a Soroban command run can be captured with metadata
- stdout/stderr excerpts are stored
- tx hash can be attached to the run

### C. GitHub Actions Ingestion
- a GitHub Actions run can be recorded
- repo, branch, commit SHA, actor, and run URL are stored

### D. Chain Correlation
- given a tx hash, the system can poll and store final tx status
- ledger number is stored when available
- contract events are attached when available

### E. Timeline
- a user can open a detail page and see command -> simulation -> tx -> final outcome timeline

### F. Alerts
- Slack alert is sent for at least one failure condition
- alert delivery status is visible in UI or activity feed

### G. Search
- user can search by tx hash and commit SHA
- user can filter by project/environment/status

---

## Suggested Build Phases

### Phase 1
Foundation
- auth
- workspaces
- projects
- environments
- database schema
- basic frontend shell

### Phase 2
Ingestion
- command run ingestion API
- CI run ingestion API
- CLI wrapper
- GitHub Actions integration

### Phase 3
Chain Correlation
- tx polling worker
- tx detail storage
- event attachment
- status updates

### Phase 4
UI
- dashboard
- list views
- detail timeline
- search/filtering

### Phase 5
Alerts
- Slack integration
- failure detection
- activity feed

### Phase 6
Polish
- idempotency improvements
- better error handling
- onboarding docs
- deployment docs

---

## Engineering Principles
- keep the MVP narrow
- optimize for developer adoption
- prefer explicit correlation over magic parsing
- preserve raw metadata alongside normalized fields
- design for traceability first, analytics second
- avoid premature abstraction
- make local and CI workflows easy

---

## Open Questions
These should be resolved during implementation planning:
- exact Soroban CLI output patterns to parse
- best method for capturing simulation output consistently
- exact RPC endpoints and polling strategy
- how to identify contract ID reliably across deploy flows
- whether to support local-only runs in MVP or prioritize CI-first
- whether to store full logs or only excerpts
- how much event decoding is needed in v1

---

## Deliverables Expected from Claude Code
Claude Code should use this spec to generate:

1. project structure
2. backend service scaffold
3. frontend app scaffold
4. database schema
5. API route definitions
6. worker/job structure
7. CLI wrapper scaffold
8. GitHub Actions integration scaffold
9. Slack alert integration scaffold
10. initial README and setup instructions

---

## Implementation Preference
If tradeoffs are needed, prioritize in this order:
1. reliable ingestion
2. tx correlation
3. clear timeline UI
4. Slack failure alerts
5. search/filtering
6. polish

---

## Final Instruction
Build the MVP for clarity, traceability, and operational usefulness.
Do not drift into generic blockchain analytics.
Do not overbuild enterprise features.
Do not broaden beyond Soroban deploy/invoke observability unless explicitly requested.
