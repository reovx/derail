import { Networks } from "@stellar/stellar-sdk";

/**
 * Network configuration.
 *
 * Testnet only — `SPEC-BELT-LEVELS.md` §3 keeps mainnet out until L6, and
 * reverses it there deliberately rather than by drift. Everything network
 * shaped resolves through this module so that reversal is one edit.
 */
export type NetworkId = "testnet" | "public";

type NetworkConfig = {
  id: NetworkId;
  label: string;
  passphrase: string;
  horizonUrl: string;
  explorerBase: string;
  /** Friendbot only exists on testnet. */
  friendbotUrl: string | null;
};

const NETWORKS: Record<NetworkId, NetworkConfig> = {
  testnet: {
    id: "testnet",
    label: "Testnet",
    passphrase: Networks.TESTNET,
    horizonUrl: "https://horizon-testnet.stellar.org",
    explorerBase: "https://stellar.expert/explorer/testnet",
    friendbotUrl: "https://friendbot.stellar.org",
  },
  public: {
    id: "public",
    label: "Mainnet",
    passphrase: Networks.PUBLIC,
    horizonUrl: "https://horizon.stellar.org",
    explorerBase: "https://stellar.expert/explorer/public",
    friendbotUrl: null,
  },
};

const configured = process.env.NEXT_PUBLIC_STELLAR_NETWORK;

export const NETWORK: NetworkConfig =
  configured === "public" ? NETWORKS.public : NETWORKS.testnet;

export const explorerTxUrl = (hash: string) => `${NETWORK.explorerBase}/tx/${hash}`;

export const explorerAccountUrl = (address: string) =>
  `${NETWORK.explorerBase}/account/${address}`;

/**
 * Base fee in stroops. 100 is the network minimum; we pay 10x so a top-up
 * does not sit in the queue behind a fee spike. It is still ~$0.000003.
 */
export const BASE_FEE = "1000";

/** Ledger entries are 0.5 XLM each; a bare account holds two. */
export const BASE_RESERVE_XLM = 0.5;
