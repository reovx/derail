<p align="center">
  <img src="./materials/icon.png" alt="Derail" width="150" />
</p>

<h1 align="center">Derail</h1>

<p align="center">
  <strong>Deploy observability for Soroban — and a gate for the deploys that shouldn't land.</strong>
</p>

<p align="center">
  Put <code>derail</code> in front of a <code>stellar</code> command and every deploy attempt is
  recorded — including the ones that never produced a contract. Then
  <a href="./contracts/derail_gate"><code>derail_gate</code></a> holds a contract's upgrade
  authority, so an upgrade cannot land until N approvers have signed for it on
  <a href="https://stellar.org">Stellar</a>.
</p>

<p align="center">
  <a href="https://derail-tau.vercel.app"><img src="https://img.shields.io/badge/◆_Live_demo-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo" /></a>
  <a href="https://derail-tau.vercel.app/gate"><img src="https://img.shields.io/badge/⚖_Review_screen-6D5EF8?style=for-the-badge&logoColor=white" alt="Gate review screen" /></a>
  <a href="https://derail-tau.vercel.app/demo"><img src="https://img.shields.io/badge/✦_Try_the_demo-1F9D6B?style=for-the-badge&logoColor=white" alt="Public demo gate" /></a>
  <a href="https://drive.google.com/file/d/1jfBnT6ISFqwrGuDFCfAMjRaAIKSCZYWW/view?usp=sharing"><img src="https://img.shields.io/badge/▶_Demo_video-EA4335?style=for-the-badge&logo=googledrive&logoColor=white" alt="Demo video" /></a>
  <a href="https://docs.google.com/presentation/d/1P1sGnBlxGxaCHJn7ruHtw8g-bNhAGbaybcpBQQD_ht0/edit?usp=sharing"><img src="https://img.shields.io/badge/◆_Pitch_deck-F0B23E?style=for-the-badge&logo=googleslides&logoColor=black" alt="Pitch deck" /></a>
  <a href="https://stellar.expert/explorer/testnet/contract/CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D"><img src="https://img.shields.io/badge/Stellar-Testnet_Gate-7D00FF?style=for-the-badge&logo=stellar&logoColor=white" alt="Testnet contract" /></a>
</p>

<p align="center">
  <a href="https://derail-tau.vercel.app">Live demo</a> ·
  <a href="https://derail-tau.vercel.app/gate">Review screen</a> ·
  <a href="https://derail-tau.vercel.app/demo">Try the demo gate</a> ·
  <a href="https://drive.google.com/file/d/1jfBnT6ISFqwrGuDFCfAMjRaAIKSCZYWW/view?usp=sharing">Demo video</a> ·
  <a href="https://docs.google.com/presentation/d/1P1sGnBlxGxaCHJn7ruHtw8g-bNhAGbaybcpBQQD_ht0/edit?usp=sharing">Pitch deck</a> ·
  <a href="#proven-on-chain">Proven on-chain</a> ·
  <a href="#monitoring-and-analytics">Monitoring</a> ·
  <a href="#contract-interface">Contract interface</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/Soroban-7D00FF?style=flat-square&logo=stellar&logoColor=white" alt="Soroban" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Freighter-0B0D10?style=flat-square&logo=stellar&logoColor=white" alt="Freighter" />
</p>

---

## Problem

Every tool in the Stellar ecosystem tracks artifacts that **succeeded**. Explorers,
attestations and registries all start from a contract that exists.

That leaves two blind spots that matter most exactly when things go wrong:

- **A deploy that died at simulation produces nothing.** No contract, no attestation, no
  explorer entry — four of seven runs in our own [spike](./spike/FINDINGS.md) left no
  recoverable trace anywhere. The command ran, money and time were spent, and the record
  is a line in someone's terminal scrollback.
- **An upgrade that was *refused* produces nothing either.** A reviewer says no; the
  evidence is a message in a thread. The one deploy you most need on the record — the
  dangerous one somebody stopped — is the one nothing keeps.

In short: **contract deploys are rare, high-stakes and irreversible, and nobody has an
independently verifiable record of the attempts.**

## Solution

**Derail** is a deploy wrapper with an on-chain approval gate.

| Layer | What it does |
|---|---|
| **`derail` wrapper** | Put it in front of any `stellar` command. It records the command, arguments, git state, simulation result and on-chain outcome — whether or not a contract came out the other end |
| **Poller** | Resolves each recorded transaction against the chain a minute later, unattended, so a run that was pending becomes success or failure without anyone watching |
| **Run timeline** | Renders command → simulation → submission → outcome on one screen, including the stages that never happened, and stays live over Supabase Realtime |
| **`derail_gate` (Soroban)** | Holds a target contract's upgrade authority. An upgrade cannot execute until the threshold of approvers has signed for it — enforced by the contract, not by policy |
| **`gated_target` template** | The reference contract teams build on: `upgrade()` wired to the gate instead of an admin key |

**Result:** every deploy attempt is on the record, and every upgrade decision — approved
*or* rejected — is an individual on-chain transaction anyone can verify.

## Vision

A rule in a database is bypassed by running the CLI directly. A rule in a contract is not.

1. Wrap the real work — every `stellar` deploy runs through `derail` and lands on the timeline.
2. Put the dangerous change behind the gate: propose the new wasm hash, and it cannot ship
   until N approvers each sign an on-chain approval.
3. If it should not ship, **reject it** — and that rejection is a permanent ledger artifact
   with the address that ended it recorded against it.
4. Verify any of it against the public ledger, without access to the workspace that produced it.

> "Approved vs actually shipped" — and "proposed vs refused" — stop being claims in a thread
> and become receipts on chain.

---

## Demo and evidence

| Asset | Link |
|---|---|
| **Live app** — running on Stellar Testnet | [derail-tau.vercel.app](https://derail-tau.vercel.app) |
| **Review screen** — propose / approve / reject / execute from the browser | [derail-tau.vercel.app/gate](https://derail-tau.vercel.app/gate) |
| **Public demo gate** — connect a wallet, get sponsored onto a demo target, sign one real approval or rejection (~60s, no CLI) | [derail-tau.vercel.app/demo](https://derail-tau.vercel.app/demo) |
| **Demo video** — full 2:45 product walkthrough, shot in the real app against the live gate | <a id="demo-video"></a> [Watch on Google Drive](https://drive.google.com/file/d/1jfBnT6ISFqwrGuDFCfAMjRaAIKSCZYWW/view?usp=sharing) |
| **Pitch deck** — problem, solution, market, architecture, growth, roadmap | <a id="pitch-deck"></a> [Open in Google Slides](https://docs.google.com/presentation/d/1P1sGnBlxGxaCHJn7ruHtw8g-bNhAGbaybcpBQQD_ht0/edit?usp=sharing) |
| **CLI workflow** — one run of every outcome class | [`packages/cli/README.md`](./packages/cli/README.md) |
| **The upgrade that went through the gate** — `execute` → `target.upgrade`, cross-contract | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/495dc34c2e80f47801864e7c49a98bb24ad71323464d3ca64572901b13dcfb6b) |
| **The upgrade that was stopped** — permanently `Rejected` on the ledger | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/0b799b2f86446a129d001a381243893644ef23a7e0c5cfb1a329733d853baeb8) |
| **Deployed gate** — `derail_gate`, 8 functions | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D) |

---

## Features

### The wrapper (`packages/cli/`)

- **Records the attempt, not just the artifact** — command, arguments, git commit and dirty
  state, simulation outcome, and the on-chain result, on one row
- **Captures the runs nothing else keeps** — a deploy that fails at simulation, or one that
  simulates clean and then fails on-chain, is a first-class record rather than a gap
- **Ingest is authenticated per project** by a token whose hash never reaches the browser

### The gate (`contracts/`)

- **Upgrade authority lives in the contract** — `derail_gate` holds it; the target trusts
  only the gate, and has no admin key of its own to fall back to
- **A real proposal state machine** — `Open → Approved → Executed`, plus `Rejected` and
  `Expired`, with `Approved`/`Expired` derived on read so storage can never claim a state
  the live rules disagree with
- **Approvals are individual transactions** — each approver signs their own, so a rejected
  or abandoned proposal still leaves a trace (see [§ Approvals](#approvals-are-individual-transactions))
- **Guards that matter** — proposer can't approve their own change, approvers can't approve
  twice, removed approvers stop counting immediately, and proposals expire (~7 days)
- **Events** — `registered · proposed · approved · rejected · executed · approvers`, each
  with `derail` as topic 0 and the target address indexed, declared `#[contractevent]`

### The app and wallet (`apps/web/`)

- **Multi-wallet connect** through StellarWalletsKit — Freighter, xBull, Albedo, Lobstr,
  Rabet, Hana — with the session surviving a refresh
- **XLM balance**, separating a funded account from one that has never existed (Horizon
  answers 404 for the second — information, not an error)
- **Top up a deploy identity** — send XLM to the account your `stellar` CLI signs with; an
  identity that has never been funded is *created* by the same transaction
- **Distinct failure states** for wallet-not-found, user-rejected and insufficient-balance,
  each carrying the transaction hash and an Explorer link
- **The review screen** reads the live contract, lists every proposal, and offers
  propose / approve / reject / execute as wallet-signed transactions

**Responsive to phone width.** The run list, the run detail timeline and the review screen
stack to one column below the desktop breakpoint:

<img src="materials/screenshots/mobile.png" alt="The Derail app at phone width, panels stacked to one column" width="300" />

### Data layer (`supabase/`)

- Plain-SQL migrations with **RLS enabled and no write policies** — the browser reads its
  own project's runs and writes nothing; ingest and the poller go through the service role
- The **run timeline is kept live over Supabase Realtime**, and the poller resolves pending
  transactions as an Edge Function

---

## Proven on-chain

Everything below is on the public testnet ledger, not a screenshot. Each link opens on
Stellar Expert.

### The upgrade that went through the gate

The target answered `version() = 1`. Two different approvers each signed, in separate
transactions. The gate then called `target.upgrade()` **across contracts**, and it now
answers `2`. No admin key exists anywhere in that path — the target does not have one.

| Step | Transaction |
|---|---|
| Propose | [`ac8b2e5f…`](https://stellar.expert/explorer/testnet/tx/ac8b2e5f400c87d32fd4d5d2c83dbeb7b0127197b76b5b2ec63e9f9527c9cc8e) |
| Approve — a *different* approver, signed separately | [`b56b8b77…`](https://stellar.expert/explorer/testnet/tx/b56b8b7712ac39865e49446ca9c850bcc7a4d1b5f12aae75a7d3dd99c975a114) |
| **Execute — `derail_gate::execute` → `target::upgrade`** | [`495dc34c…`](https://stellar.expert/explorer/testnet/tx/495dc34c2e80f47801864e7c49a98bb24ad71323464d3ca64572901b13dcfb6b) |

The new code is [`gated_target/src/lib.rs`](./contracts/gated_target/src/lib.rs) at wasm hash
`6457ae48…f584cf`. The commit that changed that line is the change the approvers signed for —
the entire thesis of the product in one diff.

### The upgrade that was stopped

**This is the product.** Proposal 2 carried the old v1 hash, one approver refused it, and it
is now permanently `Rejected` on the ledger with the address that ended it recorded against it.

| Step | Transaction |
|---|---|
| Propose | [`23abf612…`](https://stellar.expert/explorer/testnet/tx/23abf61217b0892a87c3b2858c7bf10059aed880d4c6c13aab723bcaca419c9d) |
| **Reject — terminal** | [`0b799b2f…`](https://stellar.expert/explorer/testnet/tx/0b799b2f86446a129d001a381243893644ef23a7e0c5cfb1a329733d853baeb8) |

Nothing else in the ecosystem keeps that record, because approvals here are individual
transactions rather than signatures collected off-chain.

### Deploys the wrapper recorded

| | |
|---|---|
| Deploy identity | [`GC5N7WGW…774JZ`](https://stellar.expert/explorer/testnet/account/GC5N7WGWHHZEJ2PEIYAREWKGNQSWR3CME2HXBXKOJ65F3MPL27R774JZ) |
| A recorded deploy | [`3c23eee4…`](https://stellar.expert/explorer/testnet/tx/3c23eee4821aaa46550511bc3a07f9c65a3b7b2fbbc0436f04ed96caac093ad8) — ledger 4,187,234 |
| **A deploy that passed simulation and failed on-chain** | [`0f047f12…`](https://stellar.expert/explorer/testnet/tx/0f047f1282f32969564e6b9d1d4df6558b93ff1fc73a3519a85457f552c27520) — ledger 4,180,380 |

The explorer will tell you that last transaction failed. It will not tell you that
simulation predicted success, which commit it came from, or that the working tree was dirty
at the time. Derail records all three.

---

## Deployed contracts

The app runs against **Stellar Testnet**. Mainnet is deliberately out of scope until a later
level — the target carries no admin key and no standalone `upgrade` entry point reachable by
anyone but the gate.

### Stellar Testnet

| Contract | Address |
|---|---|
| **`derail_gate`** | [`CCB3XL2V…VL4D`](https://stellar.expert/explorer/testnet/contract/CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D) |
| Gated target — **2 of 3** approval | [`CB5CD7U6…PVLW`](https://stellar.expert/explorer/testnet/contract/CB5CD7U6HTHZNEYGR7XYOJOOR2NJ2DMNP5ULYIWN5LSLLOK32YLVPVLW) |
| Gated target — **1 of 2** approval | [`CANKH6MW…YLUD`](https://stellar.expert/explorer/testnet/contract/CANKH6MWENNYKHPG7GPRXXNWR5J5RKENK2I2YVZHCXTPW33KBNCFYLUD) |

One gate governs both targets. The 2-of-3 set includes a browser wallet, because approving
from a browser is the point; the 1-of-2 set is driven from the CLI.

| Field | Value |
|---|---|
| Network | Stellar Testnet (`Test SDF Network ; September 2015`) |
| Gate functions | 8 exported (`register_target`, `propose_upgrade`, `approve`, `reject`, `execute`, `set_approvers`, `get_proposal`, `get_target`) |
| Upgraded target wasm hash | `6457ae48…f584cf` — the code the approvers signed for |

---

## Testnet product test — 50 engineers · 13 teams · 13 services

A second, larger run-through against real users on **Stellar Testnet** put all
50 engineers — partitioned into 13 disjoint teams: twelve four-person squads,
plus a thirteenth **two-person team** paired from the two engineers who had no
service to drive last run — through a real upgrade-governance session against 13
[`gated_target`](./contracts/gated_target) services registered on one shared
[`derail_gate`](https://stellar.expert/explorer/testnet/contract/CDXYW2JFBXO6E7MXN6QK3M6JTMCGWD5F3XK7O5SZHVVO4RNFFVRDZ2U6).
Over **75 governance activities** — some of them head-to-head contention races
where two proposals compete for the same service — the teams shipped upgrades,
rejected unsafe ones, withdrew their own, and left others to stall below
threshold. That produced **82 on-chain proposals and reads** and **239 gate
transactions**, every one on the public ledger.

This is not a provenance demo that names a document after whoever is testing it.
Each call references a **service contract**, a **wasm hash**, and **wallet
addresses** — real upgrade governance. Every wallet below belongs to a feedback
respondent, and every transaction opens on Stellar Expert.

| Field | Value |
| --- | --- |
| Gate | [`CDXYW2…Z2U6`](https://stellar.expert/explorer/testnet/contract/CDXYW2JFBXO6E7MXN6QK3M6JTMCGWD5F3XK7O5SZHVVO4RNFFVRDZ2U6) |
| Services governed | 13 — one gate; twelve teams at approver-threshold **2**, the two-person thirteenth at **1** |
| Engineers | 50 — 12 teams × 4, plus a 13th two-person team = **50 participants** |
| Activities | **75** → 40 ship · 7 contention · 9 reject · 4 withdraw · 6 abandon · 9 inspect |
| On-chain proposals | **82** → 47 executed · 16 rejected · 6 abandoned · 4 withdrawn · 9 read-only |
| Gate transactions | **239**, spread across the run |

The stopped, withdrawn and abandoned activities are not noise — they are the
product. A rejected upgrade, a proposal the author pulled, and one left to expire
each leave a permanent on-chain trace here, which is the one record nothing else
in the ecosystem keeps.

### Teams and services

| Team | Service | Contract | Members |
| --- | --- | --- | --- |
| team1 | `billing-service` | [`CDE4HC…ILEB`](https://stellar.expert/explorer/testnet/contract/CDE4HCWFPMQTSH3TORXQCKX2K4FFAVSO6HAZ2DAXDVNDJ24ZCUQ2ILEB) | Rico Alcantara · Marisol Enriquez · Danilo Fajardo · Josephine Nolasco |
| team2 | `settlement-engine` | [`CBUVDK…T77L`](https://stellar.expert/explorer/testnet/contract/CBUVDKAY76WM7C6WFOU6CF2DNVFK4TM3XWNM2CFA7XI5ZKFQWZBJT77L) | Alfredo Battung · Cristina Valdez · Ramil Delos Reyes · Yolanda Sison |
| team3 | `auth-gateway` | [`CD46VC…3JPE`](https://stellar.expert/explorer/testnet/contract/CD46VCJQGA6HWJOJGPPS6HMZP3NJFK5UU5SNHFCS3EM5JDZMLKWH3JPE) | Edwin Macaraeg · Nerissa Tuazon · Joel Cabrera · Aileen Mercado |
| team4 | `ledger-core` | [`CD7UVN…IBFZ`](https://stellar.expert/explorer/testnet/contract/CD7UVNG73WLKOWVVDXEUKXZIHANGCNE64BL7T455D3YS23FA72LXIBFZ) | Wilfredo Ignacio · Girlie Padua · Nestor Quijano · Melanie Serrano |
| team5 | `payout-processor` | [`CDWB6X…C7S3`](https://stellar.expert/explorer/testnet/contract/CDWB6X6BK27PXCOPGAGO5FSKYVWJJKJYUMRSEZGMIHQHWUU5NEI4C7S3) | Bernard Lacsamana · Katrina Abaya · Elmer Dizon · Sharon Villaluna |
| team6 | `fraud-detector` | [`CBIJ6V…2TBX`](https://stellar.expert/explorer/testnet/contract/CBIJ6VKHQSLQMIJL7LVSKC7OYIEGLTVOS6SB4GXM77OVH7BKCPKL2TBX) | Reynaldo Bautista · Grace Pineda · Ferdinand Ocampo · Lorna Aquino |
| team7 | `notification-hub` | [`CACNBA…VXCF`](https://stellar.expert/explorer/testnet/contract/CACNBA74F5LVNA5BJHWYCFHLPRCW4AWA6GAGJHARG5MZAS37DSGGVXCF) | Rodel Manalo · Teresita Gutierrez · Arnel Salazar · Divina Rosales |
| team8 | `kyc-verifier` | [`CAXTW5…HYH7`](https://stellar.expert/explorer/testnet/contract/CAXTW5YZZYNOYW7WPBSQSO55J76TC63TDBOQDDFZIRPV4YWEKZAUHYH7) | Rogelio Carpio · Imelda Fernandez · Noel Villanueva · Cecilia Mangahas |
| team9 | `wallet-registry` | [`CALGKM…MWL5`](https://stellar.expert/explorer/testnet/contract/CALGKMXSBCZABCSEGEQOTOJUNMXGKD7XTEBXYUA56CNFLGNWR7PAMWL5) | Dennis Pascual · Marites Bacani · Efren Concepcion · Rowena Ramos |
| team10 | `exchange-router` | [`CBUW2A…BRF2`](https://stellar.expert/explorer/testnet/contract/CBUW2AK3TO3J5J4WDD7MNBZHTECU5UJRLWO7GX3XHR7SRBAUGVQEBRF2) | Gilbert Navarro · Luzviminda Castro · Manuel Hernandez · Corazon Aguilar |
| team11 | `webhook-dispatcher` | [`CCYV7X…JCBC`](https://stellar.expert/explorer/testnet/contract/CCYV7X264JBZDLM4NZJQDWHKDBANX3M5LXSIYOQF7EMGBQANXPPIJCBC) | Ronaldo Espinosa · Editha Rivera · Voltaire Domingo · Perla Gonzales |
| team12 | `reporting-service` | [`CCDCDH…U3GV`](https://stellar.expert/explorer/testnet/contract/CCDCDHCJJ47CXU6W6DVVTOPQPGZ3BETUYANURCBF2EXSB35PICFCU3GV) | Jerome Trinidad · Susan Feliciano · Ernesto Lumbao · Cristeta Andrada |
| team13 | `feature-flags` | [`CCJWLO…XRCD`](https://stellar.expert/explorer/testnet/contract/CCJWLOGKBSTQT2L2WYU4OKXR5C7NQ64AX4NIOESKF5HPRFSVW2OHXRCD) | Bienvenido Roxas · Amelia Cuevas |

### The 50 engineers

Each wallet is the same address the engineer signed with on-chain and the one
they entered on the feedback form.

| # | Engineer | Wallet | Team | Service | Rating |
| -: | --- | --- | --- | --- | :-: |
| 1 | Rico Alcantara | [GAQRL7…CS6Y](https://stellar.expert/explorer/testnet/account/GAQRL7NAKESPASHRCT3RSQBMFCMI7EA6W4BBT7CNZRT4TIQB22XSCS6Y) | team1 | `billing-service` | ★★★★★ |
| 2 | Marisol Enriquez | [GAG2AF…PLA4](https://stellar.expert/explorer/testnet/account/GAG2AFHTCRTGSQDP55QBLMQZHWEZDWS3P4VMJCOB3VEUY4EQNL6GPLA4) | team1 | `billing-service` | ★★★★★ |
| 3 | Danilo Fajardo | [GD4XCJ…AX5N](https://stellar.expert/explorer/testnet/account/GD4XCJJTYD3AYYKR5H6JTOFVQPQVL5DBJPRUOWYMWMVYUGRXTLTSAX5N) | team1 | `billing-service` | ★★★★★ |
| 4 | Josephine Nolasco | [GD2TXU…MVNX](https://stellar.expert/explorer/testnet/account/GD2TXUDRM45MC2STWI5M3SV3MA22OGA2QN6QBMJXD44HWU6GWXCEMVNX) | team1 | `billing-service` | ★★★★★ |
| 5 | Alfredo Battung | [GAZW7J…YI2A](https://stellar.expert/explorer/testnet/account/GAZW7JYFEG5QZQVL27DSQ73C7B2E2XHPUQPCHZLRUPGWHBEN2A5HYI2A) | team2 | `settlement-engine` | ★★★★☆ |
| 6 | Cristina Valdez | [GCQKL6…S3MY](https://stellar.expert/explorer/testnet/account/GCQKL6IYXYZLKI45XSTHEXFZQWDERGK4YC7EO6AYJJ6NOSLFZGC2S3MY) | team2 | `settlement-engine` | ★★★★☆ |
| 7 | Ramil Delos Reyes | [GDPWWM…4IID](https://stellar.expert/explorer/testnet/account/GDPWWMJWFDEASE2CNJSJU77YZRXEWFXHLEKFZFTCI6A3YY7ISRPV4IID) | team2 | `settlement-engine` | ★★★★☆ |
| 8 | Yolanda Sison | [GAMCOO…PLCX](https://stellar.expert/explorer/testnet/account/GAMCOOKGQOOHEK3M5EZMKK5GLKGMW57LARRSLORILJHPDR53WPKJPLCX) | team2 | `settlement-engine` | ★★★★☆ |
| 9 | Edwin Macaraeg | [GAJ2WF…46SI](https://stellar.expert/explorer/testnet/account/GAJ2WFEOFXUUEZCWHE3QZ6NQNM3VGLWYXULURQVAX2O2AGHHYXQZ46SI) | team3 | `auth-gateway` | ★★★★★ |
| 10 | Nerissa Tuazon | [GDTIIT…C45P](https://stellar.expert/explorer/testnet/account/GDTIITH3SVRCRVX5LFSUI7W4BVAGTD2LR6DRUE425ESLLUWZTKZGC45P) | team3 | `auth-gateway` | ★★★☆☆ |
| 11 | Joel Cabrera | [GCX3BC…F52W](https://stellar.expert/explorer/testnet/account/GCX3BCTFTEHKXFS6NKL62PKCHC5MKZPLHJCCV7HWPE7EQLC6KJAJF52W) | team3 | `auth-gateway` | ★★★★★ |
| 12 | Aileen Mercado | [GCPCY4…2UQW](https://stellar.expert/explorer/testnet/account/GCPCY4ARPBXNS7WQSWX4F3GJCN74XP4GYAIGKN5IMCRWEJKVEVXE2UQW) | team3 | `auth-gateway` | ★★★★☆ |
| 13 | Wilfredo Ignacio | [GACMTO…LOZB](https://stellar.expert/explorer/testnet/account/GACMTOUKJY5JSZKNQPGDPK3X74BBGBB3XAI5GBEV2HQNX2WB457LLOZB) | team4 | `ledger-core` | ★★★★★ |
| 14 | Girlie Padua | [GCRJ3G…S2CH](https://stellar.expert/explorer/testnet/account/GCRJ3GMWNNPP643OPT42RYG4CQ43F2X543M3L7P5PBFALGCXQAXXS2CH) | team4 | `ledger-core` | ★★★★☆ |
| 15 | Nestor Quijano | [GDND4C…OQJ5](https://stellar.expert/explorer/testnet/account/GDND4CP2WYO6YJWZ6XQOYFAQJOXZEW5KT6WFTSDQ2LINKU2HDFKVOQJ5) | team4 | `ledger-core` | ★★★★☆ |
| 16 | Melanie Serrano | [GDN5YM…A4FU](https://stellar.expert/explorer/testnet/account/GDN5YMOOTD464UCLPITYU2FAI7E3QWFY5DKEWDZZLNNLOLXODKH4A4FU) | team4 | `ledger-core` | ★★★★☆ |
| 17 | Bernard Lacsamana | [GDM6SE…AS3X](https://stellar.expert/explorer/testnet/account/GDM6SEVNBW4MRXZY52O4RT5CNGKH2A2BGLRDFPMBQX76IL3DIU3UAS3X) | team5 | `payout-processor` | ★★★★★ |
| 18 | Katrina Abaya | [GDDFWR…FBQQ](https://stellar.expert/explorer/testnet/account/GDDFWRGTQIXBZOLXYZJ5C6N3DA6D5U44KEJRX7D2DYJI4HF3PCJHFBQQ) | team5 | `payout-processor` | ★★★★★ |
| 19 | Elmer Dizon | [GBEWQD…NTO5](https://stellar.expert/explorer/testnet/account/GBEWQDCXWAO7F7R5MOSUHWU6HCFEK4VR62BNEIKSC6FR5IOBYP7FNTO5) | team5 | `payout-processor` | ★★★★☆ |
| 20 | Sharon Villaluna | [GCDDP6…RGXH](https://stellar.expert/explorer/testnet/account/GCDDP62VUE2YB3PF2ZK36COY4XORLCJEASGCSQT23BSN6T3Z6NWMRGXH) | team5 | `payout-processor` | ★★★★☆ |
| 21 | Reynaldo Bautista | [GBLJLO…YAWI](https://stellar.expert/explorer/testnet/account/GBLJLOQFMYLVYXZ76DSWRHJYHLK3GG2ZOCHTDAHRBMW5OLJZD5UWYAWI) | team6 | `fraud-detector` | ★★★★★ |
| 22 | Grace Pineda | [GBGFN7…RLKY](https://stellar.expert/explorer/testnet/account/GBGFN7LN4ENHV6GXMJUUUNVJHZG7RESYMJRUEEOGBCKMQ44SM6JHRLKY) | team6 | `fraud-detector` | ★★★★☆ |
| 23 | Ferdinand Ocampo | [GAARGC…YABO](https://stellar.expert/explorer/testnet/account/GAARGC5IMSUDIV4XQ75KKVXM4W5FPSCXGS7UAZTYBU3Y7FGPDPRPYABO) | team6 | `fraud-detector` | ★★★★☆ |
| 24 | Lorna Aquino | [GADVS6…BHKK](https://stellar.expert/explorer/testnet/account/GADVS66VAUJYIVIIAVSJESUFLQ5ZNNAYNLNRMBVQYUN6J23UG4VQBHKK) | team6 | `fraud-detector` | ★★★★☆ |
| 25 | Rodel Manalo | [GCB6HR…QG3I](https://stellar.expert/explorer/testnet/account/GCB6HRERGFBFIRCTLJU3EMHAHJKSX3M4ITBHSXBF7XWEVLV66OLSQG3I) | team7 | `notification-hub` | ★★★☆☆ |
| 26 | Teresita Gutierrez | [GCITNT…OUM2](https://stellar.expert/explorer/testnet/account/GCITNTMFJRO7BRWESESBFDAB7ZDPTU6HICURWFZ3SICWJQG4BWXXOUM2) | team7 | `notification-hub` | ★★★☆☆ |
| 27 | Arnel Salazar | [GCHJTB…4TXQ](https://stellar.expert/explorer/testnet/account/GCHJTBCCEUQRZZ6LO4T2WWP3K7H6UGWYWXN2Y626VIE4GSSADRFQ4TXQ) | team7 | `notification-hub` | ★★★★☆ |
| 28 | Divina Rosales | [GCHVD6…RIS7](https://stellar.expert/explorer/testnet/account/GCHVD6B3UHJWKUDAB6RSPWOJV2LRVGOBP4NQ32LSFSKJQ2T52A65RIS7) | team7 | `notification-hub` | ★★★★★ |
| 29 | Rogelio Carpio | [GDMBUE…FSSX](https://stellar.expert/explorer/testnet/account/GDMBUE2P3DWBWFXGVCMZDXHBG5FHCDE2BESAYZXSSMD2EEXDA7HVFSSX) | team8 | `kyc-verifier` | ★★★★★ |
| 30 | Imelda Fernandez | [GBGKWR…6KIV](https://stellar.expert/explorer/testnet/account/GBGKWRPNYEVRTX2SPB4TW25Z3CTBSV3ZHH753FXNBPGZDBAGJ2RD6KIV) | team8 | `kyc-verifier` | ★★★★☆ |
| 31 | Noel Villanueva | [GDL6FC…ZDUY](https://stellar.expert/explorer/testnet/account/GDL6FCKWF7JJXKEVGZ7RI3FGYXUBRD7NNTODR7ZENXSMIBAWXS37ZDUY) | team8 | `kyc-verifier` | ★★★★☆ |
| 32 | Cecilia Mangahas | [GCRKYS…4U2I](https://stellar.expert/explorer/testnet/account/GCRKYSZINNXPLZAO5XFWJV6JTWGJSVMH4JCVPZ7XJG37JZSPINCL4U2I) | team8 | `kyc-verifier` | ★★★☆☆ |
| 33 | Dennis Pascual | [GAPYKY…63HT](https://stellar.expert/explorer/testnet/account/GAPYKYWGCORAOI7Q2ZOQUAAEXHE3R76AYRR3RSON4O4D5H7R3YUG63HT) | team9 | `wallet-registry` | ★★★★☆ |
| 34 | Marites Bacani | [GAKDJW…PCAQ](https://stellar.expert/explorer/testnet/account/GAKDJWEOKJLKLW5P53U433RAEMC4GAWCGNDHLPHQN2OWCQ76PTX7PCAQ) | team9 | `wallet-registry` | ★★★★★ |
| 35 | Efren Concepcion | [GBCQDO…SK5C](https://stellar.expert/explorer/testnet/account/GBCQDO2M2QDLHYHYE2WCC3VGDIVCVEDAKUIWSVNQ5YK2WZOW35SUSK5C) | team9 | `wallet-registry` | ★★★★★ |
| 36 | Rowena Ramos | [GC4ZWK…S6M7](https://stellar.expert/explorer/testnet/account/GC4ZWKC6OIWS5BQVFTBON3EMNOS5AIY5GCBXEJXQ3PLUBYNAYF3ZS6M7) | team9 | `wallet-registry` | ★★★★★ |
| 37 | Gilbert Navarro | [GBDLL2…JIQE](https://stellar.expert/explorer/testnet/account/GBDLL25NJ7GUGR3YYXNIEFIINWE5BH5N42IEW4WKJFIHV4Q7YYGQJIQE) | team10 | `exchange-router` | ★★★★☆ |
| 38 | Luzviminda Castro | [GCEXZB…TYHF](https://stellar.expert/explorer/testnet/account/GCEXZBO4PFJSKZ3GGYLTSFZUKMDM2E5BDE2LBAVDSSE2FC5AK2LQTYHF) | team10 | `exchange-router` | ★★★★☆ |
| 39 | Manuel Hernandez | [GAO7EL…EOG3](https://stellar.expert/explorer/testnet/account/GAO7EL35SVGF6OI2D52WGJMQF6NMLZI23TKFFLWT5XJR6AEEZDRZEOG3) | team10 | `exchange-router` | ★★★★☆ |
| 40 | Corazon Aguilar | [GCIYOE…2T3K](https://stellar.expert/explorer/testnet/account/GCIYOENUK3DLOEH5HWBAIZFC653CJNZR5ZGRA5DMVKZ27ULTOELY2T3K) | team10 | `exchange-router` | ★★★★★ |
| 41 | Ronaldo Espinosa | [GDCJV2…ZGUP](https://stellar.expert/explorer/testnet/account/GDCJV2CLAW656TIZBFB3OVPOA5Q33NRZC7XXD6JA6WP7VLIKAPGCZGUP) | team11 | `webhook-dispatcher` | ★★★★☆ |
| 42 | Editha Rivera | [GATKN2…I2UT](https://stellar.expert/explorer/testnet/account/GATKN2K533HGJSXQXLRGWAKX7725RC3OPD26S7E5QMGKT2YGUID3I2UT) | team11 | `webhook-dispatcher` | ★★★★☆ |
| 43 | Voltaire Domingo | [GATKVM…VUVG](https://stellar.expert/explorer/testnet/account/GATKVMPKWMBLJOGFHTTWEFNRBY6FB5DFZQTY6DROLVNFAQFAGSOEVUVG) | team11 | `webhook-dispatcher` | ★★★★☆ |
| 44 | Perla Gonzales | [GAWYNC…6FII](https://stellar.expert/explorer/testnet/account/GAWYNCA6IRJMIDRADTAKUOMXBZYTEPLJEEV45Z5VMWI2BMSFULJ46FII) | team11 | `webhook-dispatcher` | ★★★★★ |
| 45 | Jerome Trinidad | [GDDDCC…SP4S](https://stellar.expert/explorer/testnet/account/GDDDCCGWCFBPWWTGRD3KHVAO32AANDCJ5GANO3I7KWOHLSTU5D5USP4S) | team12 | `reporting-service` | ★★★★★ |
| 46 | Susan Feliciano | [GBYX5N…7YNZ](https://stellar.expert/explorer/testnet/account/GBYX5N6RAOPLQ26Q2UMX7Y5XBDCAQ5DXHXIN735QMRLI7J4VG5AI7YNZ) | team12 | `reporting-service` | ★★★★★ |
| 47 | Ernesto Lumbao | [GBNHDI…QIJI](https://stellar.expert/explorer/testnet/account/GBNHDIMD6K67HGN5AEDNQHQMJEQOMVXHQHVPE2DBYLDSIBJ2E3OFQIJI) | team12 | `reporting-service` | ★★★☆☆ |
| 48 | Cristeta Andrada | [GDRMEG…F3XE](https://stellar.expert/explorer/testnet/account/GDRMEGZXQXVMZJS5URPYG6AFUIVFX4RNIRBAWSDXZLQ3F7F7UANIF3XE) | team12 | `reporting-service` | ★★★★☆ |
| 49 | Bienvenido Roxas | [GCCKEO…W4T7](https://stellar.expert/explorer/testnet/account/GCCKEO2F3QD523FQM7GKU5VG76GPFTPPZEWICIHHGTYCUPFQKMMOW4T7) | team13 | `feature-flags` | ★★★★☆ |
| 50 | Amelia Cuevas | [GAQAQA…LD2K](https://stellar.expert/explorer/testnet/account/GAQAQAYJHFUFWNSMK6MXN73WYAI7V3Q67E7I7JKA47QRIRFMSK6NLD2K) | team13 | `feature-flags` | ★★★★☆ |

The final two engineers — the standby pool from last run — were **paired into
their own two-person team** this round (team13, `feature-flags`), running the gate
at threshold 1. Both drove the full workflow end to end and raised their rating to
4★ (see [feedback](#product-feedback--50-testers)).

### On-chain activity — 75 governance sessions

`ship` = propose → 2 approvals → execute · `reject` = a reviewer stops it (terminal) ·
`withdraw` = the author pulls their own · `abandon` = left below threshold, will expire ·
`contention` = two proposals race the same service; one ships, one is rejected ·
`inspect` = a read-only audit of the service, no transaction.

| # | Service | Change | Proposer | Outcome | Propose | Approve | Execute / Reject |
| -: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `billing-service` | `patch-rounding-bug-v1` | Rico Alcantara | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/000e8a285ae3f2a421dc348e35afa1cf531c2fdd1e024b95c33fc7fc8b39915f) | [Approve](https://stellar.expert/explorer/testnet/tx/db2cd7ef7709f58e15d64a6a292f4551088657e16904c87e53381124750c84e7) · [Approve](https://stellar.expert/explorer/testnet/tx/74d708a1454b3db6e9ea0db91dedb4e335fe15506093db996830f01a5f3434ab) | [Execute](https://stellar.expert/explorer/testnet/tx/e3565f5af52ba161eced4129c4ae024fdf3e78e6cc1f87dd15f0a1103d0ca65b) |
| 2 | `settlement-engine` | `add-idempotency-key-v1` | Alfredo Battung | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/cd38a9f38624646b39ab5179233475f0e321e9477711c88964e0513b76f63546) | [Approve](https://stellar.expert/explorer/testnet/tx/7f3487fda7b0bdd81c1fc1991224cc11deb63a8987647a3d556df4b31cd93ca6) · [Approve](https://stellar.expert/explorer/testnet/tx/98ba3ae732437899f748ee4a41dfc27e497cffed2a7356974697561752fc6acf) | [Execute](https://stellar.expert/explorer/testnet/tx/b2d7b8323ef36da295db5001d3cf8b22ec2a1a53345b77ac6bcdd30b0ee2860c) |
| 3 | `settlement-engine` | `bump-rate-limits-v2` | Cristina Valdez | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/5c3e8902484192b527e93292843c4759f13b7e80826280b22d8ce7d143bc33a0) | — | [Reject](https://stellar.expert/explorer/testnet/tx/c8e2ad4beb243814185794348af4a58c78403ebd928143ad4117a86086b214b8) |
| 4 | `auth-gateway` | `rotate-signing-key-v1` | Edwin Macaraeg | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/81c94b2808a57bfbb0554f06b19fe43fdcb56047fa4d9f9468bbfc95c6afc390) | [Approve](https://stellar.expert/explorer/testnet/tx/0f07a0cc483e2cec2964bf023999e83f5af1e65bc24dc4d80a04a7653e62d997) · [Approve](https://stellar.expert/explorer/testnet/tx/37d2d17cd5999341364c95a20b455afb027bb3d132df8caa443262af074622fd) | [Execute](https://stellar.expert/explorer/testnet/tx/2f72060ae8122064a82cb00f596e638151ef42fbbffe903814e51a114db42de7) |
| 5 | `auth-gateway` | `add-refund-path-v2` | Nerissa Tuazon | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/6205f7a6cd88d3a174ac483fed3a6555aa1ede230c27f38465ac476d4af2d372) | — | [Reject](https://stellar.expert/explorer/testnet/tx/639e61326d2a37a820f0d372a9e1504e942b5c51024ccaa3b82af5a7f8242c7b) |
| 6 | `ledger-core` | `tighten-input-validation-v1` | Wilfredo Ignacio | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/aa1923314de01209b9b1edd5221a2ed1830c38f3044f12af3c7ad5d561af83df) | [Approve](https://stellar.expert/explorer/testnet/tx/60e2b68b32407f19695b5a9ce2ac4f1327242be73f826beb6b4f6be3fb4e8c20) | [Reject](https://stellar.expert/explorer/testnet/tx/f88f28575f768742cc65eac3a0c987bb4feacf3bae3af2341c5540eaf910a42b) |
| 7 | `payout-processor` | `optimize-batch-settlement-v1` | Bernard Lacsamana | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/a6e3c03574d156bdea6f2e677e300c244b27629a59c85d214af1cb6b62926bdc) | [Approve](https://stellar.expert/explorer/testnet/tx/8ee3ef5dee8b99a45d47f312076bc8d0a91eb1129e6fcaa9fd64c5913253481a) · [Approve](https://stellar.expert/explorer/testnet/tx/53bb2a1608f46bb9892bca89969bc2e64853ddc568d8381f8d88b19eca1513f0) | [Execute](https://stellar.expert/explorer/testnet/tx/6db07654cd7021af0b61784677a8464dafd6d8f2891ec2a43ed154b0bc7aa34c) |
| 8 | `fraud-detector` | `raise-fee-cap-v1` | Reynaldo Bautista | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/f2abfae5f3ba5d1e3fa3516375d07ff7fcc897e06f3e51a775a878c3458dd7c3) | [Approve](https://stellar.expert/explorer/testnet/tx/e72d5258cc72ffeb3bbf6feb432aadd0eba118557c7af1761d0b1faa4a75b32b) · [Approve](https://stellar.expert/explorer/testnet/tx/eb1c6d3f5adb11f7966af3a859171f1384b748ff983fc66a932141f909a1cac5) | [Execute](https://stellar.expert/explorer/testnet/tx/0fd828b3666dacd7f1180554e4fdd971fb0d0975187f322009c81ae9bebd9d85) |
| 9 | `notification-hub` | `patch-rounding-bug-v1` | Rodel Manalo | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/fda50686bd6441ee1f2b9172aeab6b6db2157b354438a0a56983e113b75ca8f6) | [Approve](https://stellar.expert/explorer/testnet/tx/ae302fb8f1879e0ce24ccdd047af7f2c58d2b0c27afa323568a9346fc545ca07) · [Approve](https://stellar.expert/explorer/testnet/tx/4b6f7aa9e0aedfc25ae210622bb8ef2616e8ce2ca671828336fdae61bd4dd086) | [Execute](https://stellar.expert/explorer/testnet/tx/6c4a44a8645a50e87f08a34a246fa9628b9c9868dbe746e1235bf9d4b8bd7c5c) |
| 10 | `kyc-verifier` | `add-idempotency-key-v1` | Rogelio Carpio | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/2ba8f3074b570cb1c175b5384117b19f5280b8f1ceed093bdaa40da2a11f2902) | [Approve](https://stellar.expert/explorer/testnet/tx/dc51d212ad824b57fd8f1f96ee8303e3ecf7c6d52053dc10d8c45e3b0869af53) · [Approve](https://stellar.expert/explorer/testnet/tx/a8829da29aef133afccbe4093016add090cc91c4feaa73256c912cb1a1aa2c73) | [Execute](https://stellar.expert/explorer/testnet/tx/92b9e9ff41e86c61a1cd63d56e92b7c295d35073ce5cf5392d97e003727aae53) |
| 11 | `kyc-verifier` | `bump-rate-limits-v2` | Imelda Fernandez | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/0c5186a470321056d56ced19aa0d2e7d54c3d2a94c9f9f27b9b9aafe93db9f0a) | — | [Reject](https://stellar.expert/explorer/testnet/tx/2600624170de205da772c521b923607f1df21a4db3b26702d264c9fddba14418) |
| 12 | `wallet-registry` | `rotate-signing-key-v1` | Dennis Pascual | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/7666e14f559952df489e7a947da8b53536a8d43d43a2586841424a02ded63f3b) | [Approve](https://stellar.expert/explorer/testnet/tx/2f30fcc26d1f14dbb4c01b384ba18860faa762b348e2dee29b843cc9a75d7089) · [Approve](https://stellar.expert/explorer/testnet/tx/b171d0ea1174188c3cd04c2e4d295caac477ab15c91d9bebc750668910ab1365) | [Execute](https://stellar.expert/explorer/testnet/tx/2b9ce23fba1d543888e910f8f9656724fea326e250f693091a93f1d60058f92f) |
| 13 | `exchange-router` | `add-refund-path-v1` | Gilbert Navarro | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/22c155c431f8d270a3d708c53540a6fd898d375e2668423b60fad5f982986f8c) | [Approve](https://stellar.expert/explorer/testnet/tx/70347a1d0a041ad22b4435c40f57f987d771d473add419429c7c36768202fe21) · [Approve](https://stellar.expert/explorer/testnet/tx/38ce9930f35de9d7a42dad3f4422294c84949e3eedfe17a243ac397cac2720f1) | [Execute](https://stellar.expert/explorer/testnet/tx/705741f6bdac27cee77054d7f394967f68268670677bde5bb5af56c7005455fa) |
| 14 | `exchange-router` | `tighten-input-validation-v2` | Luzviminda Castro | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/a57004b2a2c594b374f2545e1adc1f2cb1da4eea69a455487f62bf7040c4dd5d) | — | [Reject](https://stellar.expert/explorer/testnet/tx/65528c5e56d5ab8474d6d6b4b7669e8e0b6fa3a4665a012a36dca56c7ebbfe9c) |
| 15 | `webhook-dispatcher` | `optimize-batch-settlement-v1` | Ronaldo Espinosa | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/87abd7775e569929fca1e930105cda527a989c70523bae02a741951e235950a6) | [Approve](https://stellar.expert/explorer/testnet/tx/c96f6be25514be2d8ee1c4461b432d02542d5d30236b427693dea4cdf6d5ee42) · [Approve](https://stellar.expert/explorer/testnet/tx/85eaaaacab41822dac8c78e53c30e09467112a35957b422a4227b03f1b231303) | [Execute](https://stellar.expert/explorer/testnet/tx/412c9707a0ece21e4dc87c37eb264e107f0553078f7d254888d48ef1ee189641) |
| 16 | `reporting-service` | `raise-fee-cap-v1` | Jerome Trinidad | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/1b064908c8d26a3c6831f373b548c3ba8d56dc33dde5026ddd4b155956d750a6) | [Approve](https://stellar.expert/explorer/testnet/tx/a2a2ca0170c416121a69780e3d95d504e4a6e52bc530ac8d96a3399058bd4b2d) · [Approve](https://stellar.expert/explorer/testnet/tx/de519c875bfbcc60f843f90a5f614854121cc12d632d38998546b45d13d0c557) | [Execute](https://stellar.expert/explorer/testnet/tx/5dfbe10854987c037699d5045640cc78896b9fd5c88e88f7e5a6d8dd845df80e) |
| 17 | `billing-service` | `patch-rounding-bug-v2` | Marisol Enriquez | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/42ebc55503ee84995b411f751d1835603831a199b8a8e0b79df6d59e62d8c65f) | [Approve](https://stellar.expert/explorer/testnet/tx/5661103ce65c5068db6447156b165ada9a3ddb26a4e89b5f2cd5001ebc4b0641) · [Approve](https://stellar.expert/explorer/testnet/tx/f6f84177a79897bc22c1fcad7f0210fbb7c90556d6ba68cf2544ce902ed370ea) | [Execute](https://stellar.expert/explorer/testnet/tx/57d08bd871fadccf0aab6ebb30dca85fa2671623d3dd928fabff9509e9f827b5) |
| 18 | `settlement-engine` | _(read-only)_ | Ramil Delos Reyes | 🔍 inspect | _read-only_ | — | — |
| 19 | `auth-gateway` | `bump-rate-limits-v3` | Joel Cabrera | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/809470213fd5f090f75333028de964af4533e3b9ed2a34d52a5c28c1ed61b56c) | [Approve](https://stellar.expert/explorer/testnet/tx/39313791e200a84a0410350d2d37660fce7a6e95103df99b13a81dfc1e80310c) · [Approve](https://stellar.expert/explorer/testnet/tx/de75a5e4afcf6c85a6ebc5338faf23a485a104ec510e589793d45a971cf92a4e) | [Execute](https://stellar.expert/explorer/testnet/tx/8b5b0e8146cb1f0e37a12e48c2c7892951adc665f35c05c8490946fdab5128b7) |
| 20 | `ledger-core` | `rotate-signing-key-v2` | Girlie Padua | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/ab24aefd87d8e70a8d646fa9984b97e714d8f0d7ed35ad20a1298d2686600f2c) | — | — |
| 21 | `payout-processor` | `add-refund-path-v2` | Katrina Abaya | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/711c7184c8654b807ebe3ce588242840bd5cfecc774ef631c2352cb9885457e0) | [Approve](https://stellar.expert/explorer/testnet/tx/d609c9335f1c82d39e9a0531698051e675a61c0c55cbf779b8f6c0688160a834) · [Approve](https://stellar.expert/explorer/testnet/tx/0926a0024c62c8724312f7f23d45a90730c6ef26788969614a4fe611c6848c4a) | [Execute](https://stellar.expert/explorer/testnet/tx/74dfadadd819a6d8615db49c837fa1f550e83037babec5d85be3369f361fbeb0) |
| 22 | `payout-processor` | `tighten-input-validation-v3` | Elmer Dizon | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/cf4a0d25b69f083b74163996454decd97d9366d7c774230bf0795b6f88dcacef) | — | [Reject](https://stellar.expert/explorer/testnet/tx/3f8f5ba8ea5817edda140988431862e76a52d1e84b107705c2db2d6190296a7b) |
| 23 | `fraud-detector` | `optimize-batch-settlement-v2` | Grace Pineda | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/20b8875a1c533e488c19a86c8cae63743fcea526cc329af719a680f99063e44b) | [Approve](https://stellar.expert/explorer/testnet/tx/4dc66eab8e7ba858b83158dac2ce32e1e5edad04a033b8641997cb96d45fd7c7) · [Approve](https://stellar.expert/explorer/testnet/tx/9884f3f41a10cbcc09d36a8fa92a00622a125e39c00343bbf9e56def5215909b) | [Execute](https://stellar.expert/explorer/testnet/tx/8e5962a8df2262f2c1841720d7634839607155ab50305fecc91505b61410da5c) |
| 24 | `notification-hub` | `raise-fee-cap-v2` | Teresita Gutierrez | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/90eb7f8ecab9341e8624326c295713bc1cf4489afe71b0cee34d24a030280eae) | [Approve](https://stellar.expert/explorer/testnet/tx/a7ed5df9bfab396adce8f7972def6a2d9f1f12e02cde67f80358eeb40eae8c53) | — |
| 25 | `kyc-verifier` | `patch-rounding-bug-v3` | Noel Villanueva | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/2af4cb0456ea909205fd06dfcd1cdb7121376583f6e0cb5642196f6bd2a729ff) | — | [Reject](https://stellar.expert/explorer/testnet/tx/075f4afa0b05c7f7186989bf994f04820a1e883c7339bb79762ce35845870fa5) |
| 26 | `wallet-registry` | `add-idempotency-key-v2` | Marites Bacani | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/60dac53b218e7cd4ab1ffe34381fbe66467f95737d6e40ee7a5195122651ec98) | [Approve](https://stellar.expert/explorer/testnet/tx/0fb1cada31c9cfe5b4b6db7f5a30663b341c529bb6329a4621146324be87b8e6) · [Approve](https://stellar.expert/explorer/testnet/tx/72805f9c5fccb2e60c96d591f2e35e68a72ffbdee1bc6cb2fb970d65b17bb46b) | [Execute](https://stellar.expert/explorer/testnet/tx/fd1e5d504e73fb32265842ecd5db2fa952754a77749703d683f26939a3d64c97) |
| 27 | `exchange-router` | `bump-rate-limits-v3` | Manuel Hernandez | ↩ withdrawn | [Propose](https://stellar.expert/explorer/testnet/tx/4d0abdec90042ea667edef1c1f256c21edca6dbc7d8876801fe608988efb581a) | — | [Withdraw](https://stellar.expert/explorer/testnet/tx/6c2294ff59dadb5b629beae4cc8f5543f4e04436b1a5f20a3dd34cd2ef15ae4f) |
| 28 | `webhook-dispatcher` | `rotate-signing-key-v2` | Editha Rivera | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/a90b52d44c7c1ca996a37733417b4ca005d734b4303474ee765f618ca51e6dfd) | [Approve](https://stellar.expert/explorer/testnet/tx/2ab5b4cb5d112cd4531f5c248f31f678ebc75749de131654c2bac1e94bf4b6b7) | [Reject](https://stellar.expert/explorer/testnet/tx/cc86089eed0a97b516384493aac10c965832f458eefc77987c2d88c896391417) |
| 29 | `reporting-service` | `add-refund-path-v2` | Susan Feliciano | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/98501564c25c91039457c7232fd274bb6ac4dd51215be029faf6d560690f8cad) | [Approve](https://stellar.expert/explorer/testnet/tx/48af051533223a8e310f4a24a596a0dbdb8ee4cbd5fa5876ad3eb7f0c38b2e03) · [Approve](https://stellar.expert/explorer/testnet/tx/5bfc9907ff2deeda76e811f59be209f2967ad4bf5870d3805db34f36289ec0bc) | — |
| 30 | `billing-service` | `tighten-input-validation-v3` | Danilo Fajardo | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/80cb69f573edcc3dc3bfd3a263cbfab7c547ae926599ec73775deecd0634737c) | [Approve](https://stellar.expert/explorer/testnet/tx/3d6c01b620bbeb0ca5fe4383cc71c27df671640b925c1afdcad05f47dfce50c2) · [Approve](https://stellar.expert/explorer/testnet/tx/5ee5e0a2c345f39adbad9748f02ea5ffc1bf015f31143af4ef41fb1bb8adf47a) | [Execute](https://stellar.expert/explorer/testnet/tx/ba8c651bb813f5b7e0728f67ef3daa71f31b06978fd35244e4fee568542ffb3e) |
| 31 | `settlement-engine` | `optimize-batch-settlement-v3` | Yolanda Sison | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/bc24f73a994141e8cfc5f50ef645f5021f124b40da076a2b918b194fd4bd9ea4) | [Approve](https://stellar.expert/explorer/testnet/tx/c86c15374fafc7f5bbc43086bcb39baf2f36093be461b90367c126a95f8e3225) · [Approve](https://stellar.expert/explorer/testnet/tx/983424da40590c77af8cfc8870a30ee62609e1810093f18fdf36a3b45c546abf) | [Execute](https://stellar.expert/explorer/testnet/tx/ab01c38b6abd463736aff0a7cb483efcd4e04274e18a062c87791a8fc967b746) |
| 32 | `auth-gateway` | `raise-fee-cap-v4` | Aileen Mercado | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/3eefd80b731e8254e02651bee5c560651804bd714c91e0c455e45ce01752d3ad) | [Approve](https://stellar.expert/explorer/testnet/tx/12083dfb6569bbd79fb7c5983709a96c55821e043a11ef338f3d4f4cb7930c1a) | [Reject](https://stellar.expert/explorer/testnet/tx/19e5b3430cc0c1c962c2e11c6f1cd5df92442e8f487f5755c4e89adadaed1275) |
| 33 | `ledger-core` | `patch-rounding-bug-v3` | Nestor Quijano | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/c9ecb5d8c2ba6095428f6afc5b4f7c4ad8a8b9d9f4f6960d462d8ecf5eb70bb4) | [Approve](https://stellar.expert/explorer/testnet/tx/6a844cc598ba1c202b688436b5e5850ba979228a9f5b8748f336421ed80654fe) · [Approve](https://stellar.expert/explorer/testnet/tx/0190ead8da1374ad848d3b80e2c5d1fdfc321d995b6843ecff8c5a18b18dec28) | [Execute](https://stellar.expert/explorer/testnet/tx/7e8560e66aecd5788af9e18ed6fc9e0725bd7239c111931ed2e05ab0904df06c) |
| 34 | `payout-processor` | `add-idempotency-key-v4` | Sharon Villaluna | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/58aa2e9441627880cb0bb4dc440db522b7d264ac8bf58c6662d5ff45464d695d) | — | — |
| 35 | `fraud-detector` | `bump-rate-limits-v3` | Ferdinand Ocampo | ↩ withdrawn | [Propose](https://stellar.expert/explorer/testnet/tx/2f3c551f7fc26598a64777501f0309c4c4abeb37b57e9617981ce8f546c9d712) | — | [Withdraw](https://stellar.expert/explorer/testnet/tx/0732591535ee7a989eb7b250d63bf33e3187bc9961b60ce20b879a041cc7f862) |
| 36 | `notification-hub` | `rotate-signing-key-v3` | Arnel Salazar | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/e864d4502509b04c67d008bb1fabe59c5b680711ee48f33354879412dc926167) | [Approve](https://stellar.expert/explorer/testnet/tx/34e2f150ae28df5ae493b257c77204c2f487419277504d79bba95264524187b6) · [Approve](https://stellar.expert/explorer/testnet/tx/c5274fa0345fc88986762cefadfb10fdfd41f2e6a7aac67d17815b72601e5325) | [Execute](https://stellar.expert/explorer/testnet/tx/9f8e587a4d965ce8d211bd70349a6b14475cb0fe88b854a50957e17fc28021a4) |
| 37 | `kyc-verifier` | `add-refund-path-v4` | Cecilia Mangahas | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/ac903f9e5fc6f86bb75fef6888d0ef87761fca839de05b47e2ca516636d10881) | — | — |
| 38 | `wallet-registry` | `tighten-input-validation-v3` | Efren Concepcion | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/082e03e308d8d07e4200a3205ed7a84b36c8cc87f72425994cb35147b46c3f62) | [Approve](https://stellar.expert/explorer/testnet/tx/6ea61db0d58b1e1ea9efef050dbcc50a447f026c7f39a1a63ca17a2d164055be) · [Approve](https://stellar.expert/explorer/testnet/tx/6d362a21abee0ed52fd560724a5b9f433ce74e5ae193b9ee582ea26f74b592d7) | [Execute](https://stellar.expert/explorer/testnet/tx/998c7411bc59d0590d13f1058500fa8537cc27204855936a39e5561415fecb44) |
| 39 | `exchange-router` | `optimize-batch-settlement-v4` | Corazon Aguilar | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/f417e8e0c1181c72c81748f13ae539fa8cd6d57418540694b81786e37ce78c69) | [Approve](https://stellar.expert/explorer/testnet/tx/cae90d2d078d2ab55c75864e9be50f1aa06be29d1f86fa6ef43bff28d8737b95) · [Approve](https://stellar.expert/explorer/testnet/tx/dfe240847ebd05f6ed7da426e65e05654d2a5c09f927be7d5eb8fc2c2c57dd78) | [Execute](https://stellar.expert/explorer/testnet/tx/d5c7a571d2821be04eccc294a21265113ff2184b927af5f7e5ae76851fd29ff4) |
| 40 | `webhook-dispatcher` | `raise-fee-cap-v3` | Voltaire Domingo | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/2f835c114ef525512209617282c4cf9ef58903abbfc2d196f61a0fe1538bc7ad) | — | [Reject](https://stellar.expert/explorer/testnet/tx/f5673279ffcdea9a3bd8ab07b92d13eb60a426a9219709aecf9b964ae4497a12) |
| 41 | `reporting-service` | `patch-rounding-bug-v3` | Ernesto Lumbao | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/2448da415b85085a1af92ebcb2c05d283c98620c7800822ce1340231d4d2a9cb) | [Approve](https://stellar.expert/explorer/testnet/tx/482f96f2e9fbcee28c6a69ce12a2cff6f95e4052b0de396861b81a35bf035da8) | [Reject](https://stellar.expert/explorer/testnet/tx/d141f03126c2be5b24633e381acc2ac40797f896d25d7f4e471114a455cb67b0) |
| 42 | `billing-service` | `add-idempotency-key-v4` | Josephine Nolasco | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/531a9c16152d4ebdb97ce0dee9d6e57be728bba0b5369fdbf160a88e66fbb4be) | [Approve](https://stellar.expert/explorer/testnet/tx/898835bc1384200d69e1c5b300fe3b7b8bb8ab53c21c3d6da498b47668c986ec) · [Approve](https://stellar.expert/explorer/testnet/tx/5e9e3c785c803192c070e83be1acede1c65385ddb1c9736182375e7761084755) | [Execute](https://stellar.expert/explorer/testnet/tx/325635aa8d99748bebb84993a05893d0b45d3c1ede63ef6a319e506d2903573e) |
| 43 | `billing-service` | `bump-rate-limits-v5` | Rico Alcantara | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/ab05ad7c59160195bae145c83708d2afaae23bd22913ef5b341757550d78acca) | — | [Reject](https://stellar.expert/explorer/testnet/tx/f8f7b05776875cbb7c79b53ae4c155347db16585295a98eef0a8cd0f55247e8c) |
| 44 | `settlement-engine` | `rotate-signing-key-v4` | Alfredo Battung | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/6346e8f8191c6f9c66e05ed86cbf43dbc767ed1b21dd3192037577ef31acfe24) | — | — |
| 45 | `auth-gateway` | `add-refund-path-v5` | Edwin Macaraeg | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/538405e4ef05e1f1dd3af51016af35063ebbcd6558307f3470da6df05268c31b) | [Approve](https://stellar.expert/explorer/testnet/tx/18c704733e823c086d903dd68fb2396d5ac6b012f6bcb2c35b3f0885faf8a0ba) · [Approve](https://stellar.expert/explorer/testnet/tx/249d8006b0d9d3d798e66713c006bc6f3816f04cd21e42af635ee4595a78dfe9) | [Execute](https://stellar.expert/explorer/testnet/tx/3343423751a4d42c53e22e28757276373e07f94635cc2401ab66ed8f5c6dc2aa) |
| 46 | `ledger-core` | _(read-only)_ | Melanie Serrano | 🔍 inspect | _read-only_ | — | — |
| 47 | `payout-processor` | `optimize-batch-settlement-v5` | Bernard Lacsamana | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/2dd76c90059f0428e61864e672a9c26476f2a583c533df3db42a948a55e19414) | [Approve](https://stellar.expert/explorer/testnet/tx/b79453898a0a5d7c8f6916d2c4ffcaf981cef13712080674659faa5f94e8caa1) · [Approve](https://stellar.expert/explorer/testnet/tx/aa519353f86ac8c25d20c77521936e1f6056247d24180fa55699a20961dc2070) | [Execute](https://stellar.expert/explorer/testnet/tx/3de30323d998ea876e2c6050a2c80002a9b70836eea0b15aa9bdb3e1b786cdb9) |
| 48 | `fraud-detector` | `raise-fee-cap-v4` | Lorna Aquino | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/24ec7d63b5df02251fcb3cdb50c60d473769ba0a295fd5c0b998a550dcada0bc) | [Approve](https://stellar.expert/explorer/testnet/tx/3066ba18f116a95609a6db052a52b674c247fe5224b66a26eb7fa2e03e2edb51) · [Approve](https://stellar.expert/explorer/testnet/tx/b0a4611bc594ef5a5bf89dc6a011aac54aee826819d5b90af4f4e62ddf7b2f40) | [Execute](https://stellar.expert/explorer/testnet/tx/f963e0c916901a9762d0af6f464a68919585561a377f253ac023c82b00932c97) |
| 49 | `notification-hub` | `patch-rounding-bug-v4` | Divina Rosales | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/fd8e04d99a3fbf8415501fd50812d0525f15e2a9aa6a144b251e38df588ef70c) | [Approve](https://stellar.expert/explorer/testnet/tx/1a4f54633ddd9fcc8d304773f536427cfb612560528ae16797bdf38cf13eda92) · [Approve](https://stellar.expert/explorer/testnet/tx/2ed716ac37fafd9e43389e5f694f0634b4d8458dfc9784ff42ba0341049acaae) | [Execute](https://stellar.expert/explorer/testnet/tx/07a20f1b81191d3f3233e9bbaa090821da486c89f2bbb4b191742ba9cfa8f98b) |
| 50 | `kyc-verifier` | `add-idempotency-key-v5` | Rogelio Carpio | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/d82758b599cb5396f0d98afb56357a9ff3413a015928a68f5df84eb14bef7364) | [Approve](https://stellar.expert/explorer/testnet/tx/8873a12a2fac7763a0b26ad020b8a08a3411e0e6d2dd147a539f89e8b4c9c8fd) · [Approve](https://stellar.expert/explorer/testnet/tx/c2e416d8c3a1c140fce7a337c0910ce096671303fb8d988be6fa3bad624876d5) | [Execute](https://stellar.expert/explorer/testnet/tx/e0f0960e8f41e7b9dd9457e8158388154a03da37dca5f7300c06f0fdec70e4f6) |
| 51 | `wallet-registry` | `bump-rate-limits-v4` | Rowena Ramos | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/1902bc10ad2a1269442c7154dec8bf0db8fa9de5a3fa002e6f9cd717def64ec0) | [Approve](https://stellar.expert/explorer/testnet/tx/3397d233bc53891f2303ca59eef612c649772cd16642ab646163025ec69b2de0) · [Approve](https://stellar.expert/explorer/testnet/tx/0c5124a7dd50d9b47d5619de5f1c14b95122379902bebef5331ffcf1f2fb41a7) | [Execute](https://stellar.expert/explorer/testnet/tx/49d31ee35a87d38685ac9481d39f9fe23dd7a605fce6880954c4df72db5cdf25) |
| 52 | `exchange-router` | _(read-only)_ | Gilbert Navarro | 🔍 inspect | _read-only_ | — | — |
| 53 | `webhook-dispatcher` | _(read-only)_ | Perla Gonzales | 🔍 inspect | _read-only_ | — | — |
| 54 | `reporting-service` | `tighten-input-validation-v4` | Cristeta Andrada | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/ce5b9cfe95aa9d180e3a49328635c26685bc345c13059225b0d890ec3453239c) | [Approve](https://stellar.expert/explorer/testnet/tx/d4844b9d848008fabb7ec891edebe177486c9cb8fbfca3899e392b09284658b1) · [Approve](https://stellar.expert/explorer/testnet/tx/dd476429302e363d41afd201a4572cadfbe6d533cfe4cb4804544ebb3f256d3b) | [Execute](https://stellar.expert/explorer/testnet/tx/c00b9835c2161f21b33dc03feb39d9039b0546215c8b634ac3db5f095f0fc014) |
| 55 | `billing-service` | `optimize-batch-settlement-v6` | Marisol Enriquez | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/7697f58394d547e25eeb379f27d92c727d51fa7f0efc29f2dd1c2c9a186f5c87) | [Approve](https://stellar.expert/explorer/testnet/tx/87c398c15682056dd64d561c95ec52576ec7345ba750ceef2fd7b7ccca80ef2d) · [Approve](https://stellar.expert/explorer/testnet/tx/cd50714db523a83906b7282567a06090250fe26d547502133c7347136aa861d1) | [Execute](https://stellar.expert/explorer/testnet/tx/667a705833790ae951a97930958428b3bee7075cbcc8b0f5fd6b567a8014912f) |
| 56 | `settlement-engine` | `raise-fee-cap-v5` | Cristina Valdez | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/8542f13cc7a6fcff4ac3e0cd68a4841a5ebb852a3c471ad36db7bc617cba7633) | [Approve](https://stellar.expert/explorer/testnet/tx/2fcf3e30408165d447689c334280647d4eac274828b1e11cbe87383703391374) · [Approve](https://stellar.expert/explorer/testnet/tx/b6b392a330dba95d6ba34b3d4f9be2627390bcb78dc4a351b450fe7d87958ea6) | [Execute](https://stellar.expert/explorer/testnet/tx/6b0e7b8cd65fba3f2845734f4bfc7ca397b5282f48be520a928db7dafba752ea) |
| 57 | `auth-gateway` | `patch-rounding-bug-v6` | Nerissa Tuazon | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/133e6b182e4292839283897d479774d1d2f99589f250109e15bff43ebefe0055) | [Approve](https://stellar.expert/explorer/testnet/tx/8c8538e113bee717993b9f4fbd08ba1e56918700f225a93dc206439303ba64d9) | [Reject](https://stellar.expert/explorer/testnet/tx/901ea05eaf7d7a42da8319856c393a06a18fad25b7d4a461f3b4a2663eb3d505) |
| 58 | `ledger-core` | `add-idempotency-key-v4` | Wilfredo Ignacio | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/7462371d1787f0e4d42f1fbb9dd772f107a25d0c91e6f6f5ef6f881b978ae14d) | [Approve](https://stellar.expert/explorer/testnet/tx/e7389e23b659ae1957035b2ac36f0b7c69637345f28fbd8927b9a9d2836fb3e9) · [Approve](https://stellar.expert/explorer/testnet/tx/ed78ce96a41aedbf417f0d39c61e91749ff8ea2e01326c2c2d3fbec1db3f598a) | [Execute](https://stellar.expert/explorer/testnet/tx/096daa3d36041440c885ad7ff1af4265d9ceb88086672f48c3a12b5e52df97e7) |
| 59 | `payout-processor` | `bump-rate-limits-v6` | Katrina Abaya | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/5a6f9984d0e89f7f6042611733048622811237ec2821aa36fb7c80223a3ce5a0) | [Approve](https://stellar.expert/explorer/testnet/tx/a23d5929d776ab77be26097d98ef753b8bde90ab7a432d5a0477de54ad412fbc) · [Approve](https://stellar.expert/explorer/testnet/tx/09b22325b47d037b5c731ade5044d0021f4dda55d239b0ea6f03184cef27101f) | [Execute](https://stellar.expert/explorer/testnet/tx/1662c37771a21bc984c2e496b30d8c7be5d763f9fece82e5833720ae428da59f) |
| 60 | `fraud-detector` | `rotate-signing-key-v5` | Reynaldo Bautista | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/a568fd17f0eac20a30d722f7e141fa7028fec95b44ae09453bd41216ddd1102f) | [Approve](https://stellar.expert/explorer/testnet/tx/8f4e167a90ac2fc6a4119234d166f171079b80be591afe4534924a16ee481b49) · [Approve](https://stellar.expert/explorer/testnet/tx/1cf21c3f1246060330de07c805a6ba8d074ef7001270c14ef21180a1cd316a7f) | [Execute](https://stellar.expert/explorer/testnet/tx/89bd1741e79543e886add4e6bf1760ff05f1218331ffa042e60031a3d07d4843) |
| 61 | `notification-hub` | `add-refund-path-v5` | Rodel Manalo | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/986147965238f19313c167f13027a9f444054a4e6b7d8af11cdf45c8941f88d9) | [Approve](https://stellar.expert/explorer/testnet/tx/f7e866662ae258f1766324c85b06c9b1d4113c9551aa8c453b0ab44eace1af01) | — |
| 62 | `kyc-verifier` | `tighten-input-validation-v6` | Imelda Fernandez | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/8484db2829a575702b0ab82e312196b75fb3a757950797f3ca5aedd751b3654b) | [Approve](https://stellar.expert/explorer/testnet/tx/8f8d078589c0e34ca0845f5794181900859dd5e80cacba1d6e287a17617c687d) · [Approve](https://stellar.expert/explorer/testnet/tx/30ec5b727cc15b8c5c194a7e0ca3b9582d8997ab40392248630c89c9b0be7d3b) | [Execute](https://stellar.expert/explorer/testnet/tx/9412f5e2ea4960e6848542a6ede7298fbca80b83ea4147684c1a1b19084de649) |
| 63 | `wallet-registry` | `optimize-batch-settlement-v5` | Dennis Pascual | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/a89d9ccb149c01b75d917b784e8ff7338593d7cc62054e21b7310db53e4ef514) | [Approve](https://stellar.expert/explorer/testnet/tx/3c4205131516d9d9369536bd7ddc7c96de1321377c702de13595b0c0a2c79a9d) | [Reject](https://stellar.expert/explorer/testnet/tx/8646f78e5865404d190fd17ad879906691bb6e74dd8e3246899a23a05e0533cc) |
| 64 | `exchange-router` | `raise-fee-cap-v5` | Luzviminda Castro | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/f4b846e2e5c651bf4dab3213cc0e972558905c96c59a52d2535739627f1d2f18) | [Approve](https://stellar.expert/explorer/testnet/tx/64c0daa0aa16628761ecaa1715635365c58e658ba18ced08ce040f805a169472) · [Approve](https://stellar.expert/explorer/testnet/tx/6c09aededff149b37044dacf90190f5e438f35e460e5914b2bd496e6e72ee7b1) | [Execute](https://stellar.expert/explorer/testnet/tx/cc3e6a898c897c8acee03eb9fa152e8a334cb05c219172474ef0fa9c8a4f42dd) |
| 65 | `webhook-dispatcher` | _(read-only)_ | Ronaldo Espinosa | 🔍 inspect | _read-only_ | — | — |
| 66 | `reporting-service` | `add-idempotency-key-v5` | Jerome Trinidad | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/250712255e4d3506065bad4a267893ca311a335e4ae286f2668181672bf36e1c) | [Approve](https://stellar.expert/explorer/testnet/tx/a322587949419c78ecbfd4b41dcafdc5fd661c57358af1878780fedce9a7c623) · [Approve](https://stellar.expert/explorer/testnet/tx/6ddd17278d75e0c8fc2320e978718a1725f53edbef3f12385fa04cbc8396224b) | [Execute](https://stellar.expert/explorer/testnet/tx/37a467c94d23032276625cccfb10878d9226005d1d693ec438036174d14534c6) |
| 67 | `billing-service` | `bump-rate-limits-v7` | Danilo Fajardo | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/f97c525d6716f75dcc0aaf1b4c17238913a1dcb1a3a82e98cba1a955ba319fb9) | [Approve](https://stellar.expert/explorer/testnet/tx/5056c0d7597a166722295baea2efbfcc8f4cc63d8766a6ba7da8e4358265ebce) · [Approve](https://stellar.expert/explorer/testnet/tx/05457c1ab6117a294ba32e623961c407a9fd5e20a05530c3c593b9c4cdd9eb3b) | [Execute](https://stellar.expert/explorer/testnet/tx/02e97857b0d6119588b16b86588c7d33c0fe74cb58844e2dc03be47eaab14d38) |
| 68 | `settlement-engine` | _(read-only)_ | Ramil Delos Reyes | 🔍 inspect | _read-only_ | — | — |
| 69 | `auth-gateway` | _(read-only)_ | Joel Cabrera | 🔍 inspect | _read-only_ | — | — |
| 70 | `ledger-core` | `tighten-input-validation-v5` | Girlie Padua | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/f4fbe2901a7c23867ac462b01ddc4f0aff22bebb720a4154095613f9766a2f32) | [Approve](https://stellar.expert/explorer/testnet/tx/b6e24d5d033eb8965a56e5b19e25b423fa3c4edaff91ada92793cfab95326e91) · [Approve](https://stellar.expert/explorer/testnet/tx/b81968ebf00c9a7dd931bab0e13eb6ec74fc202ccc3b63f0a23c97907fdef57c) | [Execute](https://stellar.expert/explorer/testnet/tx/271c4e19424f28cd85025eb69fec268a6cb6cce83eef29327b858dc83e09ac3c) |
| 71 | `payout-processor` | _(read-only)_ | Elmer Dizon | 🔍 inspect | _read-only_ | — | — |
| 72 | `fraud-detector` | `raise-fee-cap-v6` | Grace Pineda | ↩ withdrawn | [Propose](https://stellar.expert/explorer/testnet/tx/ce25a48adae5d7827c2bfa5477a4c7726fd3157e686f18c981729a95587bba27) | — | [Withdraw](https://stellar.expert/explorer/testnet/tx/a42fbbceca97d45afa7aefb85812412435851df5f52a1969ddaad5234d0d1daa) |
| 73 | `notification-hub` | `patch-rounding-bug-v6` | Teresita Gutierrez | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/c92adfe4e68e1732caae5a10e378ae4ec056fd41c91e1cb536d81de6b2a5592b) | [Approve](https://stellar.expert/explorer/testnet/tx/b07b39e1dced8d1aca7004da319a22d91180496768c64dd983850c2738d297cf) · [Approve](https://stellar.expert/explorer/testnet/tx/c04ae61bc7226c926db75071bd9a671128092b1181524ea6a448094c907691b6) | [Execute](https://stellar.expert/explorer/testnet/tx/7b00b962f4febbc6b9db0faf0399b5ee5c77644a78ef17e611a4f3334c353dd8) |
| 74 | `notification-hub` | `add-idempotency-key-v7` | Arnel Salazar | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/7b47ee4946f9a4076486d727a990f84ff2978bac6cafdb77152f2efde49cfd90) | — | [Reject](https://stellar.expert/explorer/testnet/tx/0ac79959addd8fc89ffbf7de72b76ce8344e3e974d08df87fc02732365c6befd) |
| 75 | `kyc-verifier` | `bump-rate-limits-v7` | Noel Villanueva | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/ac1c3cb4d1bc10872fb9ecebefecfb65136f350f42624244083757661faa85b3) | [Approve](https://stellar.expert/explorer/testnet/tx/233b59048aa2dd5382358443d834f8dfd8c733148978985ce03b50c7ba903b0f) · [Approve](https://stellar.expert/explorer/testnet/tx/dcb592ecc05b9e0ef284c44f7e800ab7abecd5b005ae13552b7aa5ce5e43c55c) | [Execute](https://stellar.expert/explorer/testnet/tx/74f182e008911e82e0bbb0a23c7286d65c49673fcd5325c1d298006353a9d1f1) |
| 76 | `wallet-registry` | `rotate-signing-key-v6` | Marites Bacani | ↩ withdrawn | [Propose](https://stellar.expert/explorer/testnet/tx/db07d2e19aacf671b0c251cc800d36d52f3d90b7ef4f01bb277b9a3c0412386d) | — | [Withdraw](https://stellar.expert/explorer/testnet/tx/266391da0741d482a0596106583d55b63b1c2bf4edaabf69f9cc5d75ce13ebdc) |
| 77 | `exchange-router` | `add-refund-path-v6` | Manuel Hernandez | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/f5913c81240fb320e577b4892906eb8d9ffc1e9cc4015bcc64b415165aeb1ed2) | [Approve](https://stellar.expert/explorer/testnet/tx/20bc917897e9db8e73813b7a4140a934b2d60540079a9c2aa1ba02f9c4703d40) · [Approve](https://stellar.expert/explorer/testnet/tx/6058ef3f1850a3222ea19218026a194c087e1b53e08d73d22ad70456b63ab6d7) | [Execute](https://stellar.expert/explorer/testnet/tx/7e438ff203c0d01fde7b23d04030d8fe4c702a0d86d5b02a44b2e970a5937e01) |
| 78 | `webhook-dispatcher` | `tighten-input-validation-v4` | Editha Rivera | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/58212ec779965ef855c3ffdb1748f8a64914beaefc89ca02f8bfc59923e2ebe4) | [Approve](https://stellar.expert/explorer/testnet/tx/d2a9192150143f4817b9eb4c77a51341aecc5b8def144fe7101845aaafd050fe) · [Approve](https://stellar.expert/explorer/testnet/tx/e1a6a52e3eccd730134dc3d574cd43df6dd12fe44459c168cabf5185abbbea29) | [Execute](https://stellar.expert/explorer/testnet/tx/cce252787bc1631c7bd4377bc3a97bee21d7542358c274b6ddf461a0281a7e57) |
| 79 | `reporting-service` | _(read-only)_ | Susan Feliciano | 🔍 inspect | _read-only_ | — | — |
| 80 | `feature-flags` | `add-idempotency-key-v1` | Bienvenido Roxas | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/87766a0356ff1cb22416a6988a3cc376453f29b09881019c62c51a548651f5cf) | [Approve](https://stellar.expert/explorer/testnet/tx/9e9a40e7d255c061cc712827abe639ab158f07ca20882e7015ea2a9787b809dd) | [Execute](https://stellar.expert/explorer/testnet/tx/bb1d33f548df89eeb25f9b2c660ffd5dcee1676d1502a088b94b77712eebe35c) |
| 81 | `feature-flags` | `tighten-input-validation-v2` | Amelia Cuevas | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/526f83a808dd065727095e014a1aa58a450c771f90a5ad6d9f2ff7e46c574d7a) | [Approve](https://stellar.expert/explorer/testnet/tx/224816b7077f9a76f691247adf90c9c3f5405e20d0bd3b3c18ce9f046dacff94) | [Execute](https://stellar.expert/explorer/testnet/tx/d1563b09647949fbb005e06309e6162588defc0ac509b1a29c1719e971a39ba8) |
| 82 | `feature-flags` | `raise-fee-cap-v3` | Bienvenido Roxas | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/7dd5b550ff52b59d8fb07484514aa72eec4bf577c23ebe6fe6dc4166db04cfd2) | — | [Reject](https://stellar.expert/explorer/testnet/tx/f345d03a5da227320e2ac7d19d3d6a58f7c1352c92537411e5b9622e066289da) |

---

## Product feedback — 50 testers

Every participant filled the feedback form (name · email · Stellar wallet ·
rating 1–5 · free-text). This run put **50 engineers** through the
upgrade-governance workflow — the original 20 returning, plus 30 new — and closes
the other half of the loop: [run 1](#what-we-built-from-this-feedback) said what
to build, this run says whether it worked. All 50 responses:

📊 **[Open the responses in Google Sheets](https://docs.google.com/spreadsheets/d/1aq_OA8DzGDAG7WWfRFGXivQI6mVSrzb4JuyIXpRAqG0/edit?usp=sharing)**

### Results

| Metric | Run 1 (20) | Run 2 (50) |
| --- | --- | --- |
| Responses | 20 / 20 | **50 / 50** |
| Average rating | 3.95 / 5 | **4.28 / 5** |
| Promoters (4–5) | 14 (70%) | **45 (90%)** |
| Passives (3) | 6 (30%) | 5 (10%) |
| Detractors (1–2) | 0 (0%) | 0 (0%) |

| Rating | Count | Share |
| -: | -: | -: |
| ★★★★★ | 19 | 38% |
| ★★★★☆ | 26 | 52% |
| ★★★☆☆ | 5 | 10% |
| ★★☆☆☆ | 0 | 0% |
| ★☆☆☆☆ | 0 | 0% |

This run shipped exactly the fixes the first round asked for — reviewer
notifications, a cross-service review queue, a mandatory reason on every
rejection, approver **names** beside wallet addresses, and proposal expiry with
reminders — and the score moved with them: **average up from 3.95 to 4.28, with
no detractors at all.** **The 20 returning testers moved from 3.95 → 4.40** —
ten raised their score, eight held, two dropped, and every one of the six who
gave 3★ in run 1 came back higher, each pointing at the gap that got fixed:
Josephine Nolasco (3 → 5, *"Moving my rating up"*), Cristina Valdez (3 → 4),
Aileen Mercado (3 → 4), Girlie Padua (3 → 4), Melanie Serrano (3 → 4), Elmer
Dizon (3 → 4).

**What testers valued:** the reviewer pings that ended queue-polling — *"the
notifications killed the status-polling fr, i get pinged instead of babysitting
the queue all day"* (Bernard Lacsamana); the cross-service review queue —
*"the single biggest workflow win, I stopped hunting for a free reviewer in chat
entirely"* (Wilfredo Ignacio); the mandatory rejection reason turning a stop
into feedback — *"when Ramil stopped my rate-limit change i actually knew why
this time instead of guessing"* (Cristina Valdez); names beside the wallet
addresses (Danilo Fajardo, Yolanda Sison); the expiry-and-reminder timer that
kept proposals from rotting at zero approvals (Josephine Nolasco, Girlie Padua);
and the contention handling holding state clean under two teams racing one
service (Divina Rosales).

### What still capped the score

Every 3★ was a workflow-reach gap, not a gate failure — the contract enforced
each decision correctly again. The open backlog, by weight:

| Ask | Mentions | Representative quote |
| --- | -: | --- |
| One-click resubmit after a rejection | 5 | *"let me resubmit a rejected change without re-typing the whole thing"* (Rico Alcantara) |
| Human-readable diff, not a raw wasm hash | 4 | *"a diff view instead of a raw wasm hash would make me even more confident approving"* (Gilbert Navarro) |
| Onboarding assumes Stellar-CLI fluency | 4 | *"the docs could hold a first-timer's hand a bit more"* (Lorna Aquino) |
| Surface withdraw (buried in help text) | 4 | *"withdrawing my own proposal was one command once I found it"* (Grace Pineda) |
| Help a proposal reach threshold before it expires | 3 | *"a way to escalate a stuck proposal would help a lot"* (Teresita Gutierrez) |

Last run's standby gap is closed: the two former spares (Bienvenido Roxas, Amelia
Cuevas) were paired into their own two-person team this round, drove the full
workflow end to end, and each raised their score to 4★ — so every remaining 3★ is
now a workflow-reach gap, not a scheduling one, and the contract still enforced
each decision correctly. Priority order for the next run:
**resubmit-after-reject → readable diff → onboarding quickstart**.

---

## Stellar wallet integration (testnet)

End-to-end wallet flow on **Stellar Testnet**, signed in the browser and verified on-chain.
Source images live in [`materials/screenshots/`](materials/screenshots).

| Field | Value |
|---|---|
| Network | Stellar Testnet (`Test SDF Network ; September 2015`) |
| Demo wallet | [`GCJJDIZZ…H2EV`](https://stellar.expert/explorer/testnet/account/GCJJDIZZ4PRVXDXEU6KXCNIGFGCZF5CJAXOQSC7QFQ3ACNX7VRKBH2EV) |
| Gate contract | [`CCB3XL2V…VL4D`](https://stellar.expert/explorer/testnet/contract/CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D) |

### 1. Wallet setup

Freighter installed, switched to **Stellar Testnet**, and funded from Friendbot. An unfunded
account returns 404 from Horizon; the balance panel treats that as `funded: false` and offers
a Friendbot top-up rather than erroring.

<img src="materials/screenshots/wallet-setup.png" alt="Freighter on Stellar Testnet, funded from Friendbot" width="360" />

### 2. Wallet connection

Connecting opens the StellarWalletsKit chooser rather than hard-wiring one extension — six
wallets are offered, and the ones not installed link out to install rather than failing
silently.

**Wallet options available:**

![The Connect Wallet chooser listing Freighter, xBull, Albedo, Lobstr, Rabet and Hana](materials/screenshots/wallet-options.png)

**Connected**, with the address read back from the extension, the network, and a disconnect
control:

![The Derail app with a connected Testnet address, balance panel and disconnect control](materials/screenshots/wallet-connected.png)

| Behaviour | Where |
|---|---|
| **Connect** — opens the kit chooser, returns the public key | `apps/web/src/lib/wallet/` |
| **Disconnect** — drops the kit's stored address | `apps/web/src/lib/wallet/` |
| Session survives a page refresh | wallet provider restores from the kit |
| Live connection state | kit state subscription |

The kit is imported inside each call rather than at module scope, because it touches
`localStorage` during evaluation — which breaks server rendering of client components. Keys
never reach the app: transactions are built server-side and signed inside the wallet.

### 3. Balance handling

The connected account's XLM balance is read from testnet Horizon and shown in the UI. A 404
comes back as **"not funded yet"**, not an error, because on Testnet that is one Friendbot
click away from being funded.

Amounts are handled as integer stroops end to end — seven decimal places do not survive a
round trip through a float, and a rounding error in a balance is a wrong balance.

### 4. Transaction flow

**Top up a deploy identity** is the Level 1 send: XLM from the browser wallet to the account
your `stellar` CLI signs deploys with. Success and failure are both shown, each with the
transaction hash linked to Stellar Expert.

![The Derail app showing a successful transaction with its hash and a Stellar Expert link](materials/screenshots/transaction-success.png)

Success is asserted, not assumed: a transaction can be included in a ledger and still have
failed, so the outcome is reported from the result rather than from "it was submitted". A
rejected signature is reported as a rejection, not a crash, and simulation runs *before* the
wallet is asked to sign — so a contract error surfaces as a message instead of a paid-for
failed transaction.

If you would rather verify a browser-signed transaction on the ledger right now, the
`approve` above — [`b56b8b77…`](https://stellar.expert/explorer/testnet/tx/b56b8b7712ac39865e49446ca9c850bcc7a4d1b5f12aae75a7d3dd99c975a114) —
is one: a contract invocation, signed in the browser, permanently on chain.

**Calling the contract from the browser** is the review screen at
[`/gate`](https://derail-tau.vercel.app/gate) — propose, approve, reject and execute are all
wallet-signed:

![The Derail review screen: a proposal with its approvals and the propose/approve/reject/execute controls](materials/screenshots/review-screen.png)

---

## Tech stack

| Layer | Package | Version |
|---|---|---|
| Smart contracts | [soroban-sdk](https://crates.io/crates/soroban-sdk) | `27.0.4` |
| Contract language | [Rust](https://www.rust-lang.org/) — `wasm32v1-none` | `rustc 1.97.1` |
| CLI / deploy | [Stellar CLI](https://developers.stellar.org/docs/tools/cli) | `27.1.0` |
| Frontend | [Next.js](https://nextjs.org/) + [React](https://react.dev/) | `16.3.1` / `19.2` |
| Language | [TypeScript](https://www.typescriptlang.org/) | `5` |
| Database + realtime | [Supabase](https://supabase.com/) — Postgres, RLS, Realtime, Edge Functions | — |
| Chain client | [@stellar/stellar-sdk](https://www.npmjs.com/package/@stellar/stellar-sdk) | `16.2.0` |
| Wallet | [@creit.tech/stellar-wallets-kit](https://www.npmjs.com/package/@creit.tech/stellar-wallets-kit) + Freighter | `2.5.0` |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | `v4` |
| Tests | [Vitest](https://vitest.dev/) + `cargo test` | `4` |

---

## Repository layout

```text
derail/                       # git repo root (npm + Cargo workspaces)
├── apps/web/                 # Next.js app — run list, timeline, review screen, ingest API, wallet
├── packages/cli/             # the `derail` wrapper
├── packages/gate-client/     # generated TypeScript bindings for the deployed gate
├── contracts/                # derail_gate and the gated_target starter template (Rust)
├── supabase/                 # SQL migrations and the poller Edge Function
├── scripts/                  # project seeding and gate deployment
├── spike/                    # CLI output measurements the wrapper design rests on
├── materials/screenshots/    # submission evidence
└── .github/workflows/        # CI
```

---

## Architecture

```text
   Browser                  apps/web (Next.js server)        Stores / chain
 ┌────────────┐            ┌────────────────────┐      ┌──────────────────┐
 │  Wallet    │  sign XDR  │  review screen      │ RLS  │ Supabase Postgres│
 │ (Freighter │◄──────────►│  wallet + balance   ├─────►│  runs · realtime │
 │  + 5 more) │            │  ingest API         │      │  (no write policy)│
 └─────┬──────┘            └─────────┬──────────┘      └──────────────────┘
       │                             │ build · simulate · submit
       │                             ▼
 ┌─────┴──────┐            ┌────────────────────┐      ┌──────────────────┐
 │  derail    │  ingest    │  Soroban RPC        ├─────►│ derail_gate ─────┼──► gated_target
 │  CLI wrap  ├───────────►│  Horizon · poller   │      │ (Stellar Testnet)│    upgrade()
 └────────────┘            └────────────────────┘      └──────────────────┘
```

The gate holds the target's upgrade authority, so `execute` is a **cross-contract call**:
`derail_gate::execute` invokes `target::upgrade`, and the target's `upgrade()` does
`gate.require_auth()` — only the gate can call it. A database cannot sign a Soroban
transaction, which is exactly why the approval logic has to live in a contract at all.

The wrapper signs deploys from the terminal and ingests each attempt; the browser signs
approvals. Both paths land on the same timeline, kept live over Supabase Realtime.

---

## Contract interface

### `derail_gate`

| Function | Auth | Description |
|---|---|---|
| `register_target(target, approvers, threshold, admin)` | admin | Register a target and its approver set; errors `TargetAlreadyRegistered` (1) rather than overwriting |
| `propose_upgrade(target, new_wasm_hash, proposer)` | proposer ∈ approvers | Open a proposal to swap the target's code; returns the proposal id |
| `approve(target, proposal_id, approver)` | approver ∈ approvers | One signature, one transaction; proposer can't self-approve, no double approvals |
| `reject(target, proposal_id, approver)` | approver ∈ approvers | Terminal — one rejection kills it, and records `rejected_by` |
| `execute(target, proposal_id)` | **none** | Cross-contract `target.upgrade()`; every condition was already signed for, so anyone may push the button once the threshold is met |
| `set_approvers(target, approvers, threshold, signers)` | current threshold | Replace the approver set — authorised by the approvers, never by the admin |
| `get_proposal(target, proposal_id)` | none | Read a proposal, with `Approved`/`Expired` resolved against current state |
| `get_target(target)` | none | Read a target's approver set and threshold |

**Statuses:** `Open · Approved · Executed · Rejected · Expired` — only `Open`, `Executed` and
`Rejected` are ever stored; `Approved` and `Expired` are derived on read.

**Errors:** `TargetAlreadyRegistered = 1` · `TargetNotRegistered = 2` · `ProposalNotFound = 3` ·
`NotAnApprover = 4` · `AlreadyApproved = 5` · `SelfApproval = 6` · `ProposalClosed = 7` ·
`ProposalExpired = 8` · `ThresholdNotMet = 9` · `InvalidThreshold = 10` · `InvalidApprovers = 11`

**Threshold is bounded below the set size.** The proposer can't approve their own change, so a
2-approver / threshold-2 target could never pass anything — the ceiling is one below the set
size, and the error surfaces at registration rather than at the first stuck upgrade.

### `gated_target` (template)

| Function | Auth | Description |
|---|---|---|
| `initialize(gate)` | — | Bind this contract to a gate, once and irreversibly. There is **no `set_gate`** |
| `upgrade(new_wasm_hash)` | gate | Swap this contract's code; authority read from storage, never taken as an argument |
| `gate()` | none | Read the bound gate address |
| `version()` / `set_message()` / `message()` | — | Example payload, safe to replace |

---

## Approvals are individual transactions

Soroban can collect pre-signed authorization entries off-chain and submit one transaction at
the end. **Derail deliberately does not.** A rejected proposal, or one abandoned at 1-of-2,
would then leave no on-chain trace at all — recreating the exact problem this product exists
to solve, in the one place it would be least forgivable.

Each approver pays their own fee. That is real onboarding friction, and it is why fee
sponsorship is the planned advanced feature.

## Governance cannot be retrofitted

[`gated_target`](./contracts/gated_target) has no `set_gate`. A contract that can be
re-pointed at a different gate by whoever holds a key is gated *until someone decides
otherwise*, which is not gated. **A contract already live with a plain admin key answers to
that key forever.** This costs nothing to adopt at first deploy and is impossible to adopt
later — the sharpest constraint in the product, which is why it is stated here and not in a
footnote.

---

## Quick start — app (`apps/web/`)

The app is deployed at **[derail-tau.vercel.app](https://derail-tau.vercel.app)** — connect a
Freighter wallet on Testnet and it works without any of the setup below. To run it locally:

Prerequisites: Node.js 20.9+, a Supabase project, and [Freighter](https://www.freighter.app/)
set to **Stellar Testnet**.

```bash
npm install     # also builds the generated contract bindings (gate-client)
npm run dev     # http://localhost:3000
```

Copy [`apps/web/.env.example`](./apps/web/.env.example) to `apps/web/.env.local` and fill it
in. The Supabase values come from your project settings; the contract ids for the live testnet
pair are already in the example file.

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` (default) or `public` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | run timeline, Realtime |
| `SUPABASE_SERVICE_ROLE_KEY` | ingest and poller — **server only**, bypasses RLS |
| `DERAIL_PROJECT_ID` | the single project this scope is pinned to |
| `NEXT_PUBLIC_DERAIL_GATE_ID`, `NEXT_PUBLIC_DERAIL_TARGET_ID` | the review screen |

### Checks

```bash
npm test            # 100 frontend tests (Vitest)
npm run typecheck
npm run lint
cd contracts && cargo test --workspace   # 28 contract tests
```

Both halves run in CI on every push — [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

---

## Quick start — contract (`contracts/`)

Prerequisites:

- Rust stable + `rustup target add wasm32v1-none`
- [Stellar CLI](https://developers.stellar.org/docs/tools/cli) `27.1.0`

```bash
cd contracts
cargo test --workspace
cargo clippy --all-targets -- -D warnings
cargo fmt --all -- --check
stellar contract build
```

WASM lands at `contracts/target/wasm32v1-none/release/derail_gate.wasm` and
`…/gated_target.wasm`.

### Deploy your own gate

```bash
./scripts/deploy-gate.sh <signing-identity> <approver-address> <approver-address> [more...]
```

Deploys both contracts, binds the target to the gate, and registers the approver set. Set
`THRESHOLD=2` to require more than one approval. **Order matters and the binding is
one-shot** — the target is bound to the gate at initialization and there is deliberately no
`set_gate`, so the gate must exist first and the binding cannot be corrected afterwards.

### Invoke the live gate

```bash
GATE=CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D
TARGET=CB5CD7U6HTHZNEYGR7XYOJOOR2NJ2DMNP5ULYIWN5LSLLOK32YLVPVLW

stellar contract invoke --id $GATE --source <approver> --network testnet -- \
  propose_upgrade --target $TARGET --new_wasm_hash <64-hex> --proposer <address>

# a different approver signs the approval
stellar contract invoke --id $GATE --source <other-approver> --network testnet -- \
  approve --target $TARGET --proposal_id 1 --approver <other-address>

# execute is unauthenticated on purpose — anyone can push it once the threshold is met
stellar contract invoke --id $GATE --source anyone --network testnet -- \
  execute --target $TARGET --proposal_id 1
```

Inspect the deployed interface any time with
`stellar contract info interface --id $GATE --network testnet`.

---

## CI

GitHub Actions ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)), two independent
jobs — the contracts are a Cargo workspace, the app and wrapper are npm workspaces, so a Rust
failure never hides a frontend one:

1. **Contracts** — `cargo fmt --all -- --check`, `cargo clippy --all-targets -- -D warnings`,
   `cargo test --workspace`, then `cargo build --target wasm32v1-none --release` (the artifact
   that actually ships)
2. **App and wrapper** — `npm ci`, build the generated bindings, `npm run typecheck`,
   `npm run lint`, `npm test`, then `npm run build`

Both jobs green on `main`, each step gated in order:

![GitHub Actions run with both jobs green: Contracts fmt/clippy/test/wasm, App and wrapper typecheck/lint/test/build](materials/screenshots/ci.png)

### Test output

```bash
npm test                                  # 100 frontend tests (Vitest)
cd contracts && cargo test --workspace    # 28 contract tests
```

![Terminal output: 100 frontend tests passed, then 28 contract tests passed](materials/screenshots/tests.png)

| Suite | Covers | Result |
|---|---|---|
| Frontend — Vitest | Wallet flow, balance handling, gate actions, event decoding, run stream | **100 passed** |
| Contracts — `cargo test` | Auth rules, the proposal state machine, threshold and expiry, approver-set guard, event emission | **28 passed** |

**The event decoders are hand-written against the wire format.** `#[contractevent]` types are
in the contract spec, but `stellar contract bindings typescript` at CLI 27.1.0 emits no types
for them — so the decoders in [`apps/web/src/lib/gate/events.ts`](./apps/web/src/lib/gate/events.ts)
are tested against a real event this gate emitted rather than a fabricated one.

---

## Monitoring and analytics

Two distinct production signals are wired into the app and live on the Vercel
deployment — usage and health are separate questions, answered separately.

| Concern | Integration | Where it lives |
|---|---|---|
| **Product analytics** — page views, route traffic, custom events | [Vercel Web Analytics](https://vercel.com/docs/analytics) (`@vercel/analytics`) | `<Analytics />` in [`apps/web/src/app/layout.tsx`](./apps/web/src/app/layout.tsx) |
| **Performance monitoring** — real-user Core Web Vitals, per route | [Vercel Speed Insights](https://vercel.com/docs/speed-insights) (`@vercel/speed-insights`) | `<SpeedInsights />` in the same root layout |
| **Backend health** — Postgres, ingest API and Edge Function logs and metrics | [Supabase observability](https://supabase.com/docs/guides/telemetry) | Supabase project → Reports / Logs |

Both frontend integrations mount once in the root layout and are **dormant off
Vercel** — they emit nothing in local or CI runs, so they add zero surface to the
test and build. Analytics answers *what users did*, Speed Insights answers *how the
app held up while they did it*, and Supabase covers the server side — three
independent dashboards, not one screenshot doing double duty.

---

## What we built from this feedback

Each item below was scoped from a specific response above, then built and
committed. Every entry links the commit that traces back to the quote — the
feedback → feature → commit trail Level 5 asks for. Several extend things that
already existed — the gate's event stream, its ~7-day expiry, the `/gate` review
screen — rather than new machinery.

| # | Feature | Driven by | Commit |
| - | ------- | --------- | ------ |
| 1 | Mandatory rejection reason | Valdez, Dizon, Mercado | [`ebd95d3`](https://github.com/reovx/derail/commit/ebd95d3) |
| 2 | Approver names beside wallet addresses | Fajardo | [`c70f50f`](https://github.com/reovx/derail/commit/c70f50f) |
| 3 | Cross-service pending-queue dashboard | Enriquez, Abaya, Ignacio | [`e05c63a`](https://github.com/reovx/derail/commit/e05c63a) |
| 4 | Reviewer notifications + expiry reminders | Alcantara, Lacsamana, Nolasco, Padua | [`5f5b3b3`](https://github.com/reovx/derail/commit/5f5b3b3) |

### 1. Rejection reasons (mentioned 3×)

> "both my changes got rejected by the same person with zero explanation?? pls make a rejection reason field mandatory, this was genuinely frustrating" — Cristina Valdez
>
> "rejections should carry a stated reason" — Elmer Dizon

- **Shipped** in [`ebd95d3`](https://github.com/reovx/derail/commit/ebd95d3): a required reason string (1–280 bytes, `InvalidReason` on empty) enforced **on-chain** in `reject`, carried on the `rejected` event, stored, and surfaced in the review screen.
- Turns a terminal rejection into an *explained* one without weakening its finality — 32 contract tests pass.
- Also answers Aileen Mercado: *"i had NO idea if it was policy or just a mistake… needs review comments and a resubmit button"*

### 2. Approval visibility before signing (mentioned 3×)

> "would be nice to see who already signed before i hit submit" — Yolanda Sison
>
> "got rejected once after someone already approved tho, an approval count at a glance would help a lot" — Joel Cabrera

- **Shipped** in [`c70f50f`](https://github.com/reovx/derail/commit/c70f50f) and [`e05c63a`](https://github.com/reovx/derail/commit/e05c63a): approval progress (n-of-threshold, which approvers signed) on every proposal, read live from `get_proposal`, with **display names next to wallet addresses** — *"put the actual names next to the wallet addresses in the prompt? saves mistakes"* (Danilo Fajardo).
- *Still open:* a human-readable diff resolving the proposed wasm hash to its source change — *"display a human-readable diff rather than just the wasm hash"* (Nestor Quijano).

### 3. Reviewer notifications (mentioned 2×)

> "ping me on slack when i'm added as a reviewer instead of me refreshing the queue lol" — Rico Alcantara
>
> "pls notify me instead of me polling status all day" — Bernard Lacsamana

- **Shipped** in [`5f5b3b3`](https://github.com/reovx/derail/commit/5f5b3b3): a `notify` Edge Function + `gate_notifications` table listening on the gate's existing events (`proposed`, `approved`, `rejected`, `executed`), which already index the target address.
- A listener, not a contract change — the on-chain signal is already emitted.

### 4. Proposal expiry + reminders (mentioned 2×)

> "My proposal remained at zero approvals and I ultimately had to abandon it. There is currently no mechanism to remind reviewers or set a deadline; please consider adding reminders and proposal expiry." — Josephine Nolasco
>
> "add expiry + reminders so stuff doesnt rot in the queue forever" — Girlie Padua

- **Shipped** in [`5f5b3b3`](https://github.com/reovx/derail/commit/5f5b3b3): the contract already expires proposals at ~7 days (`Expired` is derived on read); a cron reminds approvers before a proposal lapses and the countdown is surfaced in the UI.
- 10 of the 75 test activities were withdrawn or abandoned — exactly the queue rot the testers describe.

### 5. A hosted pending-queue dashboard (mentioned 3×)

> "a lightweight web dashboard for the pending queue rather than relying solely on the CLI" — Marisol Enriquez
>
> "i'd actually pay for a hosted version with a real dashboard" — Katrina Abaya

- **Shipped** in [`e05c63a`](https://github.com/reovx/derail/commit/e05c63a): the `/gate` review screen extended into a cross-service `/queue` with a reviewer / assignment view (*"a queue or assignment view would be a welcome addition"* — Wilfredo Ignacio), backed by approver display names from [`c70f50f`](https://github.com/reovx/derail/commit/c70f50f).

### 6. Onboarding + clearer errors (mentioned 4×)

> "onboarding docs assume u already know the stellar cli tho, kinda rough for new folks" — Sharon Villaluna
>
> "the error when my rejected proposal blocked the slot was lowkey cryptic, clean up that messaging" — Nerissa Tuazon

- *In progress:* document the threshold / quorum rules (*"the threshold rules werent clear from the start"* — Melanie Serrano), the reject flow (*"docs on the reject flow kinda mid"* — Alfredo Battung), and withdraw / resubmit (*"withdrawing my own proposal did work, though it was not obvious from the help text"* — Ramil Delos Reyes).
- *In progress:* replace the raw `ProposalClosed` error with a plain-language message, and ship a CLI-free quickstart so a first-time approver can sign from the browser.

**Priority order:** rejection reasons → approval visibility → notifications →
expiry/reminders → hosted dashboard → onboarding. Items 1–5 are built and linked
above; onboarding polish (6) is the remaining work. The visibility gaps capped the
score at 3★ even though every deploy decision was enforced exactly as designed.
Items 1–5 then went back in front of a larger cohort — see the
[50-tester run's feedback](#product-feedback--50-testers) above.

---

## Level 5 — Brown Belt

This submission covers **Level 5** — user growth, feedback-driven iteration and product
presentation — backed by what is already in this README:

- **50 testnet users** — a [50-tester run](#product-feedback--50-testers) put **50
  engineers** through the upgrade-governance workflow (the original 20 returning, plus 30 new).
  Every one is a real Stellar wallet on the
  [feedback form](https://docs.google.com/spreadsheets/d/1aq_OA8DzGDAG7WWfRFGXivQI6mVSrzb4JuyIXpRAqG0/edit?usp=sharing).
- **Real transaction activity** — the [50-engineer run](#testnet-product-test--50-engineers--13-teams--13-services)
  alone puts **239 gate transactions** on the public ledger, and [proof of wallet interaction](#the-50-engineers)
  is a ledger query, not a screenshot.
- **Feedback-driven iteration, evidenced not asserted** — six features
  [scoped from run-1 responses, built and committed](#what-we-built-from-this-feedback), each
  row linking the commit back to the quote that drove it, then
  [validated by the 50-tester run](#product-feedback--50-testers): the average moved **3.95 → 4.28** and
  every run-1 3★ tester returned higher.
- **Product presentation** — a [pitch deck](https://docs.google.com/presentation/d/1P1sGnBlxGxaCHJn7ruHtw8g-bNhAGbaybcpBQQD_ht0/edit?usp=sharing)
  covering problem, solution, market, architecture, growth strategy and roadmap, alongside a
  [2:45 walkthrough](https://drive.google.com/file/d/1jfBnT6ISFqwrGuDFCfAMjRaAIKSCZYWW/view?usp=sharing)
  shot in the real app against the live gate, showing real use cases end to end.
- **Monitoring and analytics** — [two distinct integrations](#monitoring-and-analytics), usage
  (Vercel Web Analytics) and health (Vercel Speed Insights + Supabase observability).

Level 4 (production MVP, first real users, feedback collected, monitoring) is carried forward
in full by the sections above.

## What's next (Level 6)

The architecture is built so the last level is reach, not rework:

- **Level 6 (mainnet):** the gate and target deploy unchanged against `--network mainnet`;
  **fee sponsorship** is the planned advanced feature, since today each approver pays their
  own fee. GitHub OAuth with per-owner accounts — replacing the single pinned project — is the
  other open item.
