# Screenshots — submission evidence (Levels 1–3)

Drop the PNGs here with these exact filenames. The main `README.md` already links
each one, so a file appears in the README the moment it lands here. Every shot maps
to a specific belt requirement — the level is noted so you know why it exists.

| File | Level | What it must show |
|---|---|---|
| `wallet-setup.png` | L1 | Freighter switched to **Stellar Testnet**, funded from Friendbot. The network label and a non-zero XLM balance must both be visible. |
| `wallet-options.png` | **L2 (required)** | The StellarWalletsKit chooser open on the app, listing the wallet options (Freighter, xBull, Albedo, Lobstr, Rabet, Hana). This is the explicit "wallet options available" screenshot L2 asks for. |
| `wallet-connected.png` | L1 | The app after connecting — connected Testnet address, the XLM balance panel, and the disconnect control all in frame. |
| `transaction-success.png` | L1 | A completed browser-signed transaction: the app's success state with the transaction hash and the "view on Stellar Expert" link. Take this while doing the "top up a deploy identity" send. |
| `review-screen.png` | L2 / L3 | The `/gate` review screen: a proposal with its approvals, and the propose / approve / reject / execute controls. This is the contract-called-from-the-browser evidence. |
| `mobile.png` | **L3 (required)** | The app at phone width — the run timeline or the review screen, sidebar collapsed / panels stacked to one column. |
| `ci.png` | **L3 (required)** | The GitHub Actions run for `main`, both jobs green (**Contracts** and **App and wrapper**). |
| `tests.png` | **L3 (required)** | Terminal output of the test suites: `npm test` showing 100 frontend tests and `cargo test --workspace` showing 28 contract tests. |

Notes
- Crop to the content; a full-desktop screenshot with a tiny app in the corner reads
  worse than a tight one.
- PNG preferred. Keep the filenames exactly as above — the README links are literal.
- `wallet-setup.png` and `wallet-connected.png` can be the same view if the balance,
  network, address and disconnect control are all visible in one frame; otherwise keep
  them separate.
