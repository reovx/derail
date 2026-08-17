"use client";

import { useCallback, useEffect, useState } from "react";

import { AccountState, loadAccount } from "./account";

const HORIZON_ERROR = "Could not reach Horizon. Try again in a moment.";

type Loaded = {
  /** Which address the account below describes. */
  forAddress: string | null;
  account: AccountState | null;
  error: string | null;
  /** A manual refresh of an address already loaded. */
  refreshing: boolean;
};

type UseAccount = {
  account: AccountState | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Loads and refreshes one account's state. A null address means idle.
 *
 * `loading` is derived rather than stored: an address whose result has not
 * arrived yet *is* the loading state, so there is nothing to keep in sync and
 * no first-render flash where a stale balance shows under a new address.
 */
export function useAccount(address: string | null): UseAccount {
  const [state, setState] = useState<Loaded>({
    forAddress: null,
    account: null,
    error: null,
    refreshing: false,
  });

  const settle = useCallback((forAddress: string, result: AccountState | null, error: string | null) => {
    setState({ forAddress, account: result, error, refreshing: false });
  }, []);

  useEffect(() => {
    if (!address || state.forAddress === address) return;

    let active = true;
    loadAccount(address).then(
      (account) => active && settle(address, account, null),
      () => active && settle(address, null, HORIZON_ERROR),
    );

    return () => {
      active = false;
    };
  }, [address, state.forAddress, settle]);

  const reload = useCallback(async () => {
    if (!address) return;
    setState((current) => ({ ...current, refreshing: true }));
    try {
      settle(address, await loadAccount(address), null);
    } catch {
      settle(address, null, HORIZON_ERROR);
    }
  }, [address, settle]);

  return {
    account: state.forAddress === address ? state.account : null,
    loading: Boolean(address) && (state.forAddress !== address || state.refreshing),
    error: state.forAddress === address ? state.error : null,
    reload,
  };
}
