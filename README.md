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
  <a href="https://drive.google.com/file/d/1zHAucBVdS0YaD4-hSiLn2MOCloKuqizn/view?usp=sharing"><img src="https://img.shields.io/badge/▶_Demo_video-EA4335?style=for-the-badge&logo=googledrive&logoColor=white" alt="Demo video" /></a>
  <a href="https://stellar.expert/explorer/testnet/contract/CCB3XL2VY6WGWGSVVRNBWGZZQ3SSXVRCMUTJ3XVFU7R5N2MS7UYOVL4D"><img src="https://img.shields.io/badge/Stellar-Testnet_Gate-7D00FF?style=for-the-badge&logo=stellar&logoColor=white" alt="Testnet contract" /></a>
</p>

<p align="center">
  <a href="https://derail-tau.vercel.app">Live demo</a> ·
  <a href="https://derail-tau.vercel.app/gate">Review screen</a> ·
  <a href="https://derail-tau.vercel.app/demo">Try the demo gate</a> ·
  <a href="https://drive.google.com/file/d/1zHAucBVdS0YaD4-hSiLn2MOCloKuqizn/view?usp=sharing">Demo video</a> ·
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
| **Demo video** — 1–2 min walkthrough | <a id="demo-video"></a> [Watch on Google Drive](https://drive.google.com/file/d/1zHAucBVdS0YaD4-hSiLn2MOCloKuqizn/view?usp=sharing) |
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

## Testnet product test — 20 engineers · 5 teams · 5 services

A run-through against real users on **Stellar Testnet** put 20 engineers — partitioned into 5
disjoint teams — through a real upgrade-governance session against 5
[`gated_target`](./contracts/gated_target) services registered on one shared
[`derail_gate`](https://stellar.expert/explorer/testnet/contract/CDXYW2JFBXO6E7MXN6QK3M6JTMCGWD5F3XK7O5SZHVVO4RNFFVRDZ2U6).
Over **35 governance activities** the teams shipped upgrades, rejected unsafe
ones, withdrew their own, and left some to stall below threshold — **109 gate
transactions**, every one on the public ledger.

This is not a provenance demo that names a document after whoever is testing it.
Each call references a **service contract**, a **wasm hash**, and **wallet
addresses** — real upgrade governance. Every wallet below belongs to a feedback
respondent, and every transaction opens on Stellar Expert.

| Field | Value |
| --- | --- |
| Gate | [`CDXYW2JF…DZ2U6`](https://stellar.expert/explorer/testnet/contract/CDXYW2JFBXO6E7MXN6QK3M6JTMCGWD5F3XK7O5SZHVVO4RNFFVRDZ2U6) |
| Services governed | 5 — one gate, one approver-threshold of **2**, five independent teams |
| Engineers | 20 (5 teams × 4), each team a disjoint squad on its own service |
| Activities | **35** → 20 shipped · 9 rejected · 2 withdrawn · 3 abandoned · 1 inspect |
| Gate transactions | **109**, spread across the run |

The stopped and abandoned activities are not noise — they are the product. A
rejected upgrade and a proposal left to expire each leave a permanent on-chain
trace here, which is the one record nothing else in the ecosystem keeps.

### Teams and services

| Team | Service | Contract | Members |
| --- | --- | --- | --- |
| team1 | `billing-service` | [`CDRKKO…ZTGU`](https://stellar.expert/explorer/testnet/contract/CDRKKOMHSAUJICHOK5THOQ4QOETFPWT3QJPIGV3G3E2K4BMU4AQ4ZTGU) | Rico Alcantara · Marisol Enriquez · Danilo Fajardo · Josephine Nolasco |
| team2 | `settlement-engine` | [`CBF3Y5…4DCD`](https://stellar.expert/explorer/testnet/contract/CBF3Y5JBMNMD6OVYADPTHXQU3PCZKPJI2BQ3X5DHQXGZ3LYNFFXU4DCD) | Alfredo Battung · Cristina Valdez · Ramil Delos Reyes · Yolanda Sison |
| team3 | `auth-gateway` | [`CA5T3X…HKXX`](https://stellar.expert/explorer/testnet/contract/CA5T3X56DS473G3I74R6QI2SPJMG7FX5JLXGQ6PXC2VU6XNH36BXHKXX) | Edwin Macaraeg · Nerissa Tuazon · Joel Cabrera · Aileen Mercado |
| team4 | `ledger-core` | [`CAPJIX…ENON`](https://stellar.expert/explorer/testnet/contract/CAPJIXBAC63KHIVWVEEQWWZVMXINT5NL2LMZWLLJMJKLR2V6GUNIENON) | Wilfredo Ignacio · Girlie Padua · Nestor Quijano · Melanie Serrano |
| team5 | `payout-processor` | [`CAUVH6…VMDH`](https://stellar.expert/explorer/testnet/contract/CAUVH6KJTHZLUWHMDVFSPCZNTYFO6SBT3BWHCSA4BKM5RM7NAVYSVMDH) | Bernard Lacsamana · Katrina Abaya · Elmer Dizon · Sharon Villaluna |

### The 20 engineers

Each wallet is the same address the engineer signed with on-chain and the one
they entered on the feedback form.

| # | Engineer | Wallet | Team | Service | Rating |
| -: | --- | --- | --- | --- | :-: |
| 1 | Rico Alcantara | [GAQRL7…CS6Y](https://stellar.expert/explorer/testnet/account/GAQRL7NAKESPASHRCT3RSQBMFCMI7EA6W4BBT7CNZRT4TIQB22XSCS6Y) | team1 | `billing-service` | ★★★★★ |
| 2 | Marisol Enriquez | [GAG2AF…PLA4](https://stellar.expert/explorer/testnet/account/GAG2AFHTCRTGSQDP55QBLMQZHWEZDWS3P4VMJCOB3VEUY4EQNL6GPLA4) | team1 | `billing-service` | ★★★★★ |
| 3 | Danilo Fajardo | [GD4XCJ…AX5N](https://stellar.expert/explorer/testnet/account/GD4XCJJTYD3AYYKR5H6JTOFVQPQVL5DBJPRUOWYMWMVYUGRXTLTSAX5N) | team1 | `billing-service` | ★★★★☆ |
| 4 | Josephine Nolasco | [GD2TXU…MVNX](https://stellar.expert/explorer/testnet/account/GD2TXUDRM45MC2STWI5M3SV3MA22OGA2QN6QBMJXD44HWU6GWXCEMVNX) | team1 | `billing-service` | ★★★☆☆ |
| 5 | Alfredo Battung | [GAZW7J…YI2A](https://stellar.expert/explorer/testnet/account/GAZW7JYFEG5QZQVL27DSQ73C7B2E2XHPUQPCHZLRUPGWHBEN2A5HYI2A) | team2 | `settlement-engine` | ★★★★★ |
| 6 | Cristina Valdez | [GCQKL6…S3MY](https://stellar.expert/explorer/testnet/account/GCQKL6IYXYZLKI45XSTHEXFZQWDERGK4YC7EO6AYJJ6NOSLFZGC2S3MY) | team2 | `settlement-engine` | ★★★☆☆ |
| 7 | Ramil Delos Reyes | [GDPWWM…4IID](https://stellar.expert/explorer/testnet/account/GDPWWMJWFDEASE2CNJSJU77YZRXEWFXHLEKFZFTCI6A3YY7ISRPV4IID) | team2 | `settlement-engine` | ★★★★☆ |
| 8 | Yolanda Sison | [GAMCOO…PLCX](https://stellar.expert/explorer/testnet/account/GAMCOOKGQOOHEK3M5EZMKK5GLKGMW57LARRSLORILJHPDR53WPKJPLCX) | team2 | `settlement-engine` | ★★★★☆ |
| 9 | Edwin Macaraeg | [GAJ2WF…46SI](https://stellar.expert/explorer/testnet/account/GAJ2WFEOFXUUEZCWHE3QZ6NQNM3VGLWYXULURQVAX2O2AGHHYXQZ46SI) | team3 | `auth-gateway` | ★★★★★ |
| 10 | Nerissa Tuazon | [GDTIIT…C45P](https://stellar.expert/explorer/testnet/account/GDTIITH3SVRCRVX5LFSUI7W4BVAGTD2LR6DRUE425ESLLUWZTKZGC45P) | team3 | `auth-gateway` | ★★★★☆ |
| 11 | Joel Cabrera | [GCX3BC…F52W](https://stellar.expert/explorer/testnet/account/GCX3BCTFTEHKXFS6NKL62PKCHC5MKZPLHJCCV7HWPE7EQLC6KJAJF52W) | team3 | `auth-gateway` | ★★★★☆ |
| 12 | Aileen Mercado | [GCPCY4…2UQW](https://stellar.expert/explorer/testnet/account/GCPCY4ARPBXNS7WQSWX4F3GJCN74XP4GYAIGKN5IMCRWEJKVEVXE2UQW) | team3 | `auth-gateway` | ★★★☆☆ |
| 13 | Wilfredo Ignacio | [GACMTO…LOZB](https://stellar.expert/explorer/testnet/account/GACMTOUKJY5JSZKNQPGDPK3X74BBGBB3XAI5GBEV2HQNX2WB457LLOZB) | team4 | `ledger-core` | ★★★★☆ |
| 14 | Girlie Padua | [GCRJ3G…S2CH](https://stellar.expert/explorer/testnet/account/GCRJ3GMWNNPP643OPT42RYG4CQ43F2X543M3L7P5PBFALGCXQAXXS2CH) | team4 | `ledger-core` | ★★★☆☆ |
| 15 | Nestor Quijano | [GDND4C…OQJ5](https://stellar.expert/explorer/testnet/account/GDND4CP2WYO6YJWZ6XQOYFAQJOXZEW5KT6WFTSDQ2LINKU2HDFKVOQJ5) | team4 | `ledger-core` | ★★★★☆ |
| 16 | Melanie Serrano | [GDN5YM…A4FU](https://stellar.expert/explorer/testnet/account/GDN5YMOOTD464UCLPITYU2FAI7E3QWFY5DKEWDZZLNNLOLXODKH4A4FU) | team4 | `ledger-core` | ★★★☆☆ |
| 17 | Bernard Lacsamana | [GDM6SE…AS3X](https://stellar.expert/explorer/testnet/account/GDM6SEVNBW4MRXZY52O4RT5CNGKH2A2BGLRDFPMBQX76IL3DIU3UAS3X) | team5 | `payout-processor` | ★★★★☆ |
| 18 | Katrina Abaya | [GDDFWR…FBQQ](https://stellar.expert/explorer/testnet/account/GDDFWRGTQIXBZOLXYZJ5C6N3DA6D5U44KEJRX7D2DYJI4HF3PCJHFBQQ) | team5 | `payout-processor` | ★★★★★ |
| 19 | Elmer Dizon | [GBEWQD…NTO5](https://stellar.expert/explorer/testnet/account/GBEWQDCXWAO7F7R5MOSUHWU6HCFEK4VR62BNEIKSC6FR5IOBYP7FNTO5) | team5 | `payout-processor` | ★★★☆☆ |
| 20 | Sharon Villaluna | [GCDDP6…RGXH](https://stellar.expert/explorer/testnet/account/GCDDP62VUE2YB3PF2ZK36COY4XORLCJEASGCSQT23BSN6T3Z6NWMRGXH) | team5 | `payout-processor` | ★★★★☆ |

### On-chain activity — 35 governance sessions

`ship` = propose → 2 approvals → execute · `reject` = a reviewer stops it (terminal) ·
`withdraw` = the author pulls their own · `abandon` = left below threshold, will expire ·
`inspect` = a read-only audit of the service, no transaction.

| # | Service | Change | Proposer | Outcome | Propose | Approve | Execute / Reject |
| -: | --- | --- | --- | --- | --- | --- | --- |
| 1 | `billing-service` | `patch-rounding-bug-v1` | Rico Alcantara | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/b94af27255ff4f7264189d6d302c90b0120f4952ff798e557456ed760a420e3d) | [Approve](https://stellar.expert/explorer/testnet/tx/531ff1c5ac15c14a009263d00c4cdbd2a942b3b1a4dcbae8f3a9099a557293a5) · [Approve](https://stellar.expert/explorer/testnet/tx/022571680b88dd833cd56861878ece3feb3f3af776b99539bf4707dcf86e8cbb) | [Execute](https://stellar.expert/explorer/testnet/tx/e747ef6c4a42243e80dde7d5e16452378eca785a00b8b4a2dd63e2e75b8c41ae) |
| 2 | `settlement-engine` | `add-idempotency-key-v1` | Alfredo Battung | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/e01cadd881876b5ab9613a8349f93c9f1d3b328f27f28de82ac9eb32eb0cb1bc) | [Approve](https://stellar.expert/explorer/testnet/tx/bc2acafc5a9013a04751916aff781cbfdef8c130638004d912e98fb9de1922e5) · [Approve](https://stellar.expert/explorer/testnet/tx/f53ebf242eec3128b421cf2e685830c12d907c88d7537905625fd3c9bade2cb2) | [Execute](https://stellar.expert/explorer/testnet/tx/7c4e43546b5f481009a2c43f3d9eb9eb4e1c7d2ceda9b15134db465eeddc9be7) |
| 3 | `settlement-engine` | `bump-rate-limits-v2` | Cristina Valdez | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/0fa51495a58aee5d9aaddbc224c44197f4ac5c36e6da2d52ba928da5c683fe95) | — | [Reject](https://stellar.expert/explorer/testnet/tx/65886a1d707289b780db4ecaa5f3bbaace492c4d059454ab8f640a7e9dd4242b) |
| 4 | `auth-gateway` | `rotate-signing-key-v1` | Edwin Macaraeg | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/8054b9fd09b1da4b8f43939e8adb7eff27ea20d81543cafd9f685654d42dc562) | [Approve](https://stellar.expert/explorer/testnet/tx/25f134514fc5814679e1cbd91697e42b5bd93c05aa186d09a187f10161c7e994) · [Approve](https://stellar.expert/explorer/testnet/tx/f00b4d62016a88cfa3d11f8328d73b78896d5dc3c7e809a2c3b6de87d81372cc) | [Execute](https://stellar.expert/explorer/testnet/tx/1a5c1fd1f673a163e4680dd12645f64df6a062a347286f8eb18567d84d1e24f4) |
| 5 | `auth-gateway` | `add-refund-path-v2` | Nerissa Tuazon | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/9042a4a3d6b5a845b918683a670b8aea6115dc33baffa52add76678622060b91) | — | [Reject](https://stellar.expert/explorer/testnet/tx/69690276f241b7590ced5b243894b684c540ad58e10053df810a08901acb6b8e) |
| 6 | `ledger-core` | `tighten-input-validation-v1` | Wilfredo Ignacio | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/5e762abb54579166cb36d3ea917bf5c5ee2375deee92cdc43028f3fa573b3159) | [Approve](https://stellar.expert/explorer/testnet/tx/d3e41e640e9f44bb4609d22663fd130bd5014f11c651b4ef7fa2ea571b4c5452) | [Reject](https://stellar.expert/explorer/testnet/tx/2f54606680ee5c5921bd132b77555646622d796c030e0538b3fad906f8c3d01d) |
| 7 | `payout-processor` | `optimize-batch-settlement-v1` | Bernard Lacsamana | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/65d0cfc4936dba6230fbec16e9d8a8ecc4b2b84d2cc8ff820b4cb9373936e9dc) | [Approve](https://stellar.expert/explorer/testnet/tx/4c467b44b68c328db1e183660280f9b5df964590c629ce3a305ef02af4ee0d34) · [Approve](https://stellar.expert/explorer/testnet/tx/027ac1cc7263b03497d00032129ae572c1513644483e2a41f199748a469c69cd) | [Execute](https://stellar.expert/explorer/testnet/tx/b812b6bfe80eb9702b616393982009fad3b6d640d4e6298af1faff76e014f4a3) |
| 8 | `billing-service` | `raise-fee-cap-v2` | Marisol Enriquez | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/27367cb1829d5809f60475f865f073efdee5aa89bbb2a41cf7ada3f373218805) | [Approve](https://stellar.expert/explorer/testnet/tx/0865d6b013c7a2284af2c5ba53d72129223656566cf4ab8093c6ad73eda742b4) · [Approve](https://stellar.expert/explorer/testnet/tx/9f60044382d25fc266d06d0d4395a103df8d19824c2c953a58acf03aab4e5c66) | [Execute](https://stellar.expert/explorer/testnet/tx/84d8448b7a201256cf3745004566c33ff6095d6d2b5ce606bf4073344d0c2b47) |
| 9 | `settlement-engine` | `patch-rounding-bug-v3` | Ramil Delos Reyes | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/44c789881c092aa815614cf8240f14a778f74813827dbff132767b54ec641d53) | [Approve](https://stellar.expert/explorer/testnet/tx/dbd029ac237c07ec22760856710e7b853630d334005422327ded32105217ef6c) · [Approve](https://stellar.expert/explorer/testnet/tx/68580f4a8674f4bf5c271ef69be700cff15ac1feadd47a705e6621839641ad9d) | [Execute](https://stellar.expert/explorer/testnet/tx/5fe1ddab9e2ae1fc67082dfc3aea9c6f3e278e34cada7b3008a77400143fb04d) |
| 10 | `auth-gateway` | `add-idempotency-key-v3` | Joel Cabrera | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/07d266c07c4958d2881b1f6dd978eaffabeffe4b31377c852b10f626c275b5f9) | [Approve](https://stellar.expert/explorer/testnet/tx/4de2db1e0a0af740a479288dcbf953a166e0c30d5bb9a958d9eda80a00c78c0d) · [Approve](https://stellar.expert/explorer/testnet/tx/22480ffc0747ebc590154898cd6125aef014f1f8e08a1667d1887d294e09178e) | [Execute](https://stellar.expert/explorer/testnet/tx/95bb765bd66bf6de243cb6046cc8e4b1ea4ac0a3267495d959fc3de96504cc81) |
| 11 | `auth-gateway` | `bump-rate-limits-v4` | Aileen Mercado | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/f1c7d44aeb3d1d4f88dc12f3f3c70bb0e94cca11159625c35684695fb1aedb7f) | — | [Reject](https://stellar.expert/explorer/testnet/tx/4beafd9ebfb9c2a393d364a53396f04a9750e793049f1b11fbed83c287f26fc3) |
| 12 | `ledger-core` | `rotate-signing-key-v2` | Girlie Padua | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/1dbb3828dab8e622acdbe2336a5aceaf4cad03fb45fe04d55582298605bd05c3) | [Approve](https://stellar.expert/explorer/testnet/tx/20d21c0607083f5464a2b7dc48fa902ab1c797f1cd1549518218d425beaa7a75) · [Approve](https://stellar.expert/explorer/testnet/tx/cfa8db4f3f57bd413f77352e81e563b897991fef4096207d3cfbc41181a0f453) | [Execute](https://stellar.expert/explorer/testnet/tx/6691b58a404ac7e88831f693af6e4eed58d0024afd7e11a56c2906e91e196284) |
| 13 | `payout-processor` | `add-refund-path-v2` | Katrina Abaya | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/63b5723c7743884c6202230f637fce0cb88dad88acd2b9bf1666906d7076657a) | [Approve](https://stellar.expert/explorer/testnet/tx/6039f767a55837e434d7f3ea88b206b91b065d0969613ea2ae3f2d3300336f43) · [Approve](https://stellar.expert/explorer/testnet/tx/41ccf4f55ce98ccaf251e6f8f8b6a27b0d0b8e8666c375eed2ac70629b4cf9dc) | [Execute](https://stellar.expert/explorer/testnet/tx/06ee09e6a3f7d052058bda662572bbd14d9ca5bdfdfdb960d01931714c02dc6a) |
| 14 | `payout-processor` | `tighten-input-validation-v3` | Elmer Dizon | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/c595b10d0ac3414d673136e4063624df162be3d173558879ef56a7a058a1005e) | — | [Reject](https://stellar.expert/explorer/testnet/tx/f9862c6bf4c9b25e84b902900b94f4441545c2a769454e30eb507ef7c6c1603d) |
| 15 | `billing-service` | `optimize-batch-settlement-v3` | Danilo Fajardo | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/0a318d1d65afca755a004ec2f269314020babc885fb0f9feb6d824bb7e7279a5) | [Approve](https://stellar.expert/explorer/testnet/tx/52ee8fcba5ac514b9ae8a1daa062add217afe2f8f26b4f9383cb957b4c1e0b83) · [Approve](https://stellar.expert/explorer/testnet/tx/be5f0592b62bd23d196395240fb60c98641e9978bfd0d6978f17300b2f7b13df) | [Execute](https://stellar.expert/explorer/testnet/tx/6e93243d48942e23f333a4cdaaf3c431a1fd4cafaedf1592175cc113f19cf3af) |
| 16 | `settlement-engine` | `raise-fee-cap-v4` | Yolanda Sison | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/5047ecacb9270029a0d1c031ca182248955d3b39ed4b7228fe7d5b24712bf615) | [Approve](https://stellar.expert/explorer/testnet/tx/9cd9dc0e84c394873df9d540a5b5fdf18001e170e0a6154842396d8b012beb60) · [Approve](https://stellar.expert/explorer/testnet/tx/6b4592feee1c0dc376322f07d9e4ec03081debf839b79a6c5ec93d6fb62477eb) | [Execute](https://stellar.expert/explorer/testnet/tx/debd40b6331eea8b8a3bc9bfdc6aacbf6f0f32f4ad4a79ceb0ac0c3f8edbfbad) |
| 17 | `auth-gateway` | `patch-rounding-bug-v5` | Edwin Macaraeg | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/f939e8e2083aa9dc6d7dcd03aa54a73207023dc4810bdcec0ce2694dbf405fae) | [Approve](https://stellar.expert/explorer/testnet/tx/a02ce8501415a5aeb53e2adef83204cdaead06949a2e0562663f62747ce1dd45) · [Approve](https://stellar.expert/explorer/testnet/tx/003cd918943b7bf2ab85f756fb756fbc48f83d1a42d8f301264cb0631130dfe7) | [Execute](https://stellar.expert/explorer/testnet/tx/a9b710b5cc7314f4d13556562bf0b8a9099c29600590837a25b69203860c2cee) |
| 18 | `ledger-core` | _(read-only)_ | Nestor Quijano | 🔍 inspect | _read-only_ | — | — |
| 19 | `payout-processor` | `bump-rate-limits-v4` | Sharon Villaluna | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/1b22125768e0b46e3923c945d79d2eb4abad728c71b6057b124d63da45b5c132) | [Approve](https://stellar.expert/explorer/testnet/tx/300ab3122afcef3f06b593c2f9e66c10211983802edbb71a5bc4c4b349cdcd08) · [Approve](https://stellar.expert/explorer/testnet/tx/63b664e1b31c0f965eeeff1a4003913efdad011413afbfeffab53d066a19695f) | [Execute](https://stellar.expert/explorer/testnet/tx/9cc2b25070da9cd141b24ad06d42791137faaa5b316da951e644f5631eed90fc) |
| 20 | `billing-service` | `rotate-signing-key-v4` | Josephine Nolasco | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/9e980c1636146e9c62d8c411ee73bfbea7e07caed9d44a32d4e450a53f258169) | — | — |
| 21 | `settlement-engine` | `add-refund-path-v5` | Alfredo Battung | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/a50e53a99e00ac85735f59d02e83ee9297df4ff5df6dafde67bff766938b9537) | [Approve](https://stellar.expert/explorer/testnet/tx/ee6dcc1df2cd1e0f287d4a96e95bde37db9687fa374a0bc64afc4c082cea98ec) · [Approve](https://stellar.expert/explorer/testnet/tx/783c9d8676fb2ab3eee60848f3ca38bce4a208fb2b263e616b99fb1bfc398730) | [Execute](https://stellar.expert/explorer/testnet/tx/13c741a9fc85dc17c949ff6630bbad80af19886683013d1b7d89210a812139d5) |
| 22 | `settlement-engine` | `tighten-input-validation-v6` | Cristina Valdez | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/d4c6bda324322859f9d2659a1ac33c0da84c19c6f880bc5b9ee3e29453431ab6) | — | [Reject](https://stellar.expert/explorer/testnet/tx/f35322b3b411218d783baf2def5bb039de5f093ee208a27317632c5443d17d4b) |
| 23 | `auth-gateway` | `optimize-batch-settlement-v6` | Nerissa Tuazon | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/6feace99696c70b953f91403569d485384d799289c7818da81098a25a5b66140) | [Approve](https://stellar.expert/explorer/testnet/tx/010b35c191b6bb61a570c03fa7ec01f43d5e04493f13a448762dfb053624e716) · [Approve](https://stellar.expert/explorer/testnet/tx/59757811c5b66db9c5fd88bf26f3f1247fa417f06aa8b6f655a947fbddb009d7) | [Execute](https://stellar.expert/explorer/testnet/tx/fc79e4f090b99043a5ba18c879461a2ea9f49e29f6bf1e9ac2f5b6e80c1b90c5) |
| 24 | `ledger-core` | `raise-fee-cap-v3` | Melanie Serrano | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/92f010894c5111f899a5b19cbba0bca5e186de93fa21641329558066a09caa58) | [Approve](https://stellar.expert/explorer/testnet/tx/d6009dcc864fc1cb51165db209724bf7657248aaf4b07aa093bfa09f68358a06) | — |
| 25 | `payout-processor` | `patch-rounding-bug-v5` | Bernard Lacsamana | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/49b532160b8f40888863082865a3761815bbe190c011897ffa27f2adb88ab6d6) | — | [Reject](https://stellar.expert/explorer/testnet/tx/6736d6d81ee434a4407ea2172f782d8298044e61a792b9ec7f7eb86a0b90380d) |
| 26 | `billing-service` | `add-idempotency-key-v5` | Rico Alcantara | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/6e064adfca3cb9e6d7f40be075e9810ad20bce683aec8fe81e15c2cf73eb8f40) | [Approve](https://stellar.expert/explorer/testnet/tx/79ac1cf9fdd776e4aa05ff1ca35fe8145366a7e711bc368fdd4067f463e5a201) · [Approve](https://stellar.expert/explorer/testnet/tx/f5cc0c912f0c3353380ad929b341f9dd43ed32a32c8c06c303fca13420e11203) | [Execute](https://stellar.expert/explorer/testnet/tx/af88fe0093e62c164a64d03d036a6ed90e90f7ca8dd04d6c34358d1cb9f3a38a) |
| 27 | `settlement-engine` | `bump-rate-limits-v7` | Ramil Delos Reyes | ↩ withdrawn | [Propose](https://stellar.expert/explorer/testnet/tx/e262088f578d1304976e106f25b37cb9d8e2c62680d5a638c4e6c7c1d4f760d8) | — | [Withdraw](https://stellar.expert/explorer/testnet/tx/7e53ab76eec442038b4c1f9a68cbb2d7a2d31d5177a13230d9fb5ae33000daaf) |
| 28 | `auth-gateway` | `rotate-signing-key-v7` | Joel Cabrera | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/8d547ccc9d709bfdaa33ed426657ff7b003b982ff6873adb3a0f57193621b567) | [Approve](https://stellar.expert/explorer/testnet/tx/b1a24a0cf2112ee6029b0e55a4d856d7aa6641f01328508bf80a2acc0df3828d) | [Reject](https://stellar.expert/explorer/testnet/tx/6e1862aa47e234b4e5c6032015c58366fc7d3a01ae0c4789f8600d7ddfa7016b) |
| 29 | `ledger-core` | `add-refund-path-v4` | Wilfredo Ignacio | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/903685360cb5f6a4a0f20038f2dbbedb34aa7d9c0028439b5d9c655c55067410) | [Approve](https://stellar.expert/explorer/testnet/tx/83d712969a90919ef648d4152ce3c8db5cdb9dd779e5c322f94439335c8960ac) · [Approve](https://stellar.expert/explorer/testnet/tx/1d9b9958dcad8af36f4b088eb7c19667fe853813d663ac2f84d50d235616b1ff) | [Execute](https://stellar.expert/explorer/testnet/tx/19d34654adf5e52c60d2a34ddb39c05cf5c376d841f8bf9d626aa7182971f16f) |
| 30 | `payout-processor` | `tighten-input-validation-v6` | Katrina Abaya | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/d2ff2a06d6320d091c7461050eaf1f69f027487e1316090012b1de8b289a41a3) | [Approve](https://stellar.expert/explorer/testnet/tx/f1ea87783446c5cc81486dd33a8a8db120e84eebe7099d1fce67b406179817d8) · [Approve](https://stellar.expert/explorer/testnet/tx/d7a45273964d84370f27da4faafdec1da3d31238abb5e1efe7cee10176f91a07) | [Execute](https://stellar.expert/explorer/testnet/tx/2f9670e881fad7edf837b620f61784de76d6e12418150cd869091b6c4fa5d2f8) |
| 31 | `billing-service` | `optimize-batch-settlement-v6` | Marisol Enriquez | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/b96f0ee42e5b9e7407f4e8a2303046637fc07aaeea73d27efe6c8f03e7736117) | [Approve](https://stellar.expert/explorer/testnet/tx/1589080c41df8c9cc04cce432fe4c37b19885b6beaefbd7b17005e710252e112) · [Approve](https://stellar.expert/explorer/testnet/tx/fc1cf5d012ba6252548f2ecec83602b14d179f2c34100aa4eaaac49d27ebefe7) | [Execute](https://stellar.expert/explorer/testnet/tx/58261aaf1b00a44f9073da75180b098326bdff5ac7d92271f164a6343a95f54f) |
| 32 | `settlement-engine` | `raise-fee-cap-v8` | Yolanda Sison | ⛔ rejected | [Propose](https://stellar.expert/explorer/testnet/tx/35371247f0bacf41df8dfeabc82b9b34de763fc8e304ff2afd16596f851e7463) | [Approve](https://stellar.expert/explorer/testnet/tx/f97eb2a723d6b2702d01f3b474dab6d6a0429a0acf7b9517bedf4ce8071e2985) | [Reject](https://stellar.expert/explorer/testnet/tx/f8557f303cdcd6539a49a7465543d5ecc59f1fe9390784b59f0a8e082045d046) |
| 33 | `auth-gateway` | `patch-rounding-bug-v8` | Aileen Mercado | ✅ shipped | [Propose](https://stellar.expert/explorer/testnet/tx/16505cc4cbff4acc84bf052742a15aa921ba9bb748d3974ef1951323d7a2fa06) | [Approve](https://stellar.expert/explorer/testnet/tx/588498426ff13d0c77b06b7ba6d1410d1555a4b39ed4b06e85f2e42cd3002965) · [Approve](https://stellar.expert/explorer/testnet/tx/ac7eaec8e91d791bccdbf1e70e0133f30dd74fa4ff358590636dcfcd8edff503) | [Execute](https://stellar.expert/explorer/testnet/tx/786939246e4712940317291ad6bdaf829aea82c77c51a084a0bd3b80249a6900) |
| 34 | `ledger-core` | `add-idempotency-key-v5` | Girlie Padua | ⏳ abandoned | [Propose](https://stellar.expert/explorer/testnet/tx/439a47a4bbf06c02bd87be4815e52af90eb8333a637ae953d1c9b83ce674201e) | — | — |
| 35 | `payout-processor` | `bump-rate-limits-v7` | Elmer Dizon | ↩ withdrawn | [Propose](https://stellar.expert/explorer/testnet/tx/0f266195537e9637ef189486bae864a15c43fd8fb92c44b16a9097fb602d7cf8) | — | [Withdraw](https://stellar.expert/explorer/testnet/tx/51440527efcda879b19fdbccd51bde9e546becdb3935a1bf66ef76fbd28832aa) |

---

## Product feedback — 20 testers

Every engineer who ran a session filled the feedback form (name · email ·
Stellar wallet · rating 1–5 · free-text). All 20 responses:

📊 **[Open the responses in Google Sheets](https://docs.google.com/spreadsheets/d/1kNUNKwQQI7eNKfsxinjlsX3CxTAUiWOVGZc9hX8FaL0/edit?usp=sharing)**

### Results

| Metric | Value |
| --- | --- |
| Responses | **20 / 20** |
| Average rating | **3.95 / 5** |
| Promoters (4–5) | 14 (70%) |
| Passives (3) | 6 (30%) |
| Detractors (1–2) | 0 (0%) |

| Rating | Count | Share |
| -: | -: | -: |
| ★★★★★ | 5 | 25% |
| ★★★★☆ | 9 | 45% |
| ★★★☆☆ | 6 | 30% |
| ★★☆☆☆ | 0 | 0% |
| ★☆☆☆☆ | 0 | 0% |

**What testers valued:** the two-key gate — *"nothing ships without a second
signature"* (Edwin Macaraeg) — approvals and rejections landing as permanent
on-chain artifacts, one-command rejection of an unsafe upgrade, fast testnet
finality, and the read-latest / inspect command for auditing before signing. One
tester caught a bad change mid-review: *"the gate caught a sketchy change i was
reviewing… i'd actually pay for a hosted version with a real dashboard"*
(Katrina Abaya).

**What hurt the score:** no notification when added as a reviewer (testers
polled the queue by hand), no rejection-reason field, no at-a-glance view of who
had already signed, proposals rotting at zero approvals with no reminder or
visible expiry, and onboarding docs that assume Stellar-CLI fluency. Every 3★
response is a workflow-visibility gap, not a broken deploy — the gate itself
enforced every decision correctly.

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

## What we build from this feedback

Each item is scoped from the responses above, in priority order. Several map to
extensions of things that already exist — the gate's event stream, its ~7-day
expiry, the `/gate` review screen — rather than new machinery.

### 1. Rejection reasons (mentioned 3×)

> "both my changes got rejected by the same person with zero explanation?? pls make a rejection reason field mandatory, this was genuinely frustrating" — Cristina Valdez
>
> "rejections should carry a stated reason" — Elmer Dizon

- Required reason string on `reject`, surfaced in the review screen and carried on the `rejected` event
- Turns a terminal rejection into an *explained* one without weakening its finality
- Also answers Aileen Mercado: *"i had NO idea if it was policy or just a mistake… needs review comments and a resubmit button"*

### 2. Approval visibility before signing (mentioned 3×)

> "would be nice to see who already signed before i hit submit" — Yolanda Sison
>
> "got rejected once after someone already approved tho, an approval count at a glance would help a lot" — Joel Cabrera

- Approval progress (n-of-threshold, which approvers signed) on every proposal in `/gate`, read live from `get_proposal`
- A human-readable diff resolving the proposed wasm hash to its source change — *"display a human-readable diff rather than just the wasm hash"* (Nestor Quijano)

### 3. Reviewer notifications (mentioned 2×)

> "ping me on slack when i'm added as a reviewer instead of me refreshing the queue lol" — Rico Alcantara
>
> "pls notify me instead of me polling status all day" — Bernard Lacsamana

- Webhook / Slack listener on the gate's existing events (`proposed`, `approved`, `rejected`, `executed`), which already index the target address
- A listener, not a contract change — the on-chain signal is already emitted

### 4. Proposal expiry + reminders (mentioned 2×)

> "My proposal remained at zero approvals and I ultimately had to abandon it. There is currently no mechanism to remind reviewers or set a deadline; please consider adding reminders and proposal expiry." — Josephine Nolasco
>
> "add expiry + reminders so stuff doesnt rot in the queue forever" — Girlie Padua

- The contract **already** expires proposals at ~7 days (`Expired` is derived on read); surface the countdown in the UI and remind approvers before it lapses
- 5 of the 35 test activities were withdrawn or abandoned — exactly the queue rot the testers describe

### 5. A hosted pending-queue dashboard (mentioned 3×)

> "a lightweight web dashboard for the pending queue rather than relying solely on the CLI" — Marisol Enriquez
>
> "i'd actually pay for a hosted version with a real dashboard" — Katrina Abaya

- Extend the existing `/gate` review screen into a cross-service pending queue with a reviewer / assignment view (*"a queue or assignment view would be a welcome addition"* — Wilfredo Ignacio)
- Show approver display names next to wallet addresses — *"put the actual names next to the wallet addresses in the prompt? saves mistakes"* (Danilo Fajardo)

### 6. Onboarding + clearer errors (mentioned 4×)

> "onboarding docs assume u already know the stellar cli tho, kinda rough for new folks" — Sharon Villaluna
>
> "the error when my rejected proposal blocked the slot was lowkey cryptic, clean up that messaging" — Nerissa Tuazon

- Document the threshold / quorum rules (*"the threshold rules werent clear from the start"* — Melanie Serrano), the reject flow (*"docs on the reject flow kinda mid"* — Alfredo Battung), and withdraw / resubmit (*"withdrawing my own proposal did work, though it was not obvious from the help text"* — Ramil Delos Reyes)
- Replace the raw `ProposalClosed` error with a plain-language message, and ship a CLI-free quickstart so a first-time approver can sign from the browser

**Priority order:** rejection reasons → approval visibility → notifications →
expiry/reminders → hosted dashboard → onboarding. The visibility gaps capped the
score at 3★ even though every deploy decision was enforced exactly as designed.

---

## Level 4 — Blue Belt

This submission covers **Level 4**, backed by what is already in this README:

- **Production MVP** on Vercel against Stellar Testnet, mobile responsive, with loading and
  error states throughout.
- **First real users** — the [public demo gate](./docs/specs/SPEC-DEMO-GATE.md) lets anyone
  connect, get sponsored onto a demo target, and sign one real on-chain approval or rejection;
  the [20-engineer testnet run](#testnet-product-test--20-engineers--5-teams--5-services) puts
  **109 gate transactions** on the public ledger, and [proof of wallet interaction](#the-20-engineers)
  is a ledger query, not a screenshot.
- **User feedback** — all [20 responses](#product-feedback--20-testers) collected, scored and
  turned into a [prioritised backlog](#what-we-build-from-this-feedback).
- **Monitoring and analytics** — [two distinct integrations](#monitoring-and-analytics), usage
  (Vercel Web Analytics) and health (Vercel Speed Insights + Supabase observability).

## What's next (Levels 5–6)

The architecture is built so the later levels are reach, not rework:

- **Level 5 (growth):** 50 testnet users recruited against the demo gate, features shipped from
  the feedback backlog above, and GitHub OAuth with per-owner accounts replacing the single
  pinned project.
- **Level 6 (mainnet):** the gate and target deploy unchanged against `--network mainnet`;
  **fee sponsorship** is the planned advanced feature, since today each approver pays their
  own fee.
