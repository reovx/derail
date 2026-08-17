/**
 * The wallet boundary.
 *
 * L1 talks to Freighter directly; `SPEC-BELT-LEVELS.md` §4 replaces it with
 * StellarWalletsKit at L2. Everything above this interface is written against
 * the interface, so that swap is a new adapter and nothing else.
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
}
