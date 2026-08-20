/**
 * The wallet boundary.
 *
 * Every wallet reaches the app through this interface, so nothing above it has
 * to know which wallet it is talking to. `SPEC-BELT-LEVELS.md` §4 called for
 * replacing raw Freighter with StellarWalletsKit at L2, and the swap cost one
 * new adapter and one line in the provider — which is the return on having
 * drawn the boundary at L1.
 */

export type WalletErrorKind =
  /** No wallet extension is installed, or it is not reachable. */
  | "not_found"
  /** The user dismissed or declined the prompt. */
  | "rejected"
  /** Wallet is installed but locked / no account selected. */
  | "locked"
  /** Wallet is pointed at a different network than the app. */
  | "wrong_network"
  | "unknown";

export class WalletError extends Error {
  readonly kind: WalletErrorKind;

  constructor(kind: WalletErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "WalletError";
    this.kind = kind;
  }
}

export type WalletNetwork = {
  /** The wallet's own label, e.g. "TESTNET". */
  network: string;
  passphrase: string;
};

export interface WalletAdapter {
  readonly id: string;
  readonly name: string;
  readonly installUrl: string;

  /** Is the extension present at all? Must never throw. */
  isAvailable(): Promise<boolean>;

  /** Prompts for access. Throws `WalletError` on refusal. */
  connect(): Promise<string>;

  /**
   * The already-authorised address, or null. Must not prompt — this is what
   * restores a session across a page refresh.
   */
  getAuthorizedAddress(): Promise<string | null>;

  getNetwork(): Promise<WalletNetwork>;

  /** Returns the signed transaction envelope XDR. */
  signTransaction(xdr: string, opts: { networkPassphrase: string; address: string }): Promise<string>;

  /**
   * Optional, because not every wallet has one. Freighter exposes no revoke, so
   * disconnecting there is only the app forgetting the session; StellarWalletsKit
   * does clear its own selection, which is a real difference and worth honouring
   * rather than flattening.
   */
  disconnect?(): Promise<void>;
}
