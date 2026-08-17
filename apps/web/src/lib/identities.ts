"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Deploy identities — the accounts a project actually deploys with.
 *
 * The product answer is `command_runs.actor`: Derail already knows which
 * identity signed each deploy, which is what makes "top up a deploy identity"
 * a real feature rather than a send form with a different label. That table
 * does not exist yet (`SPEC-MVP1.md` §4.2), so these are kept in the browser
 * and the UI says so. When ingest lands, this module is the only thing that
 * changes.
 *
 * localStorage is an external store, so it is read through
 * `useSyncExternalStore`: one source of truth, correct during hydration, and
 * consistent across every component and browser tab that shows the list.
 */

const STORAGE_KEY = "derail.identities";

export type DeployIdentity = {
  /** The `stellar keys` name, e.g. `ref-deployer`. */
  name: string;
  address: string;
  addedAt: string;
};

const EMPTY: DeployIdentity[] = [];

/** Snapshots must be referentially stable, so the parse is cached per raw string. */
let cachedRaw: string | null = null;
let cachedValue: DeployIdentity[] = EMPTY;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab writing the same key is the same change.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): DeployIdentity[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedValue;

  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    cachedValue = Array.isArray(parsed) ? (parsed as DeployIdentity[]) : EMPTY;
  } catch {
    cachedValue = EMPTY;
  }
  return cachedValue;
}

/** There is no localStorage on the server; the list starts empty and fills in. */
function getServerSnapshot(): DeployIdentity[] {
  return EMPTY;
}

function write(next: DeployIdentity[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function useDeployIdentities() {
  const identities = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const remember = useCallback((name: string, address: string) => {
    const trimmed = name.trim() || "unnamed identity";
    write([
      { name: trimmed, address, addedAt: new Date().toISOString() },
      ...getSnapshot().filter((identity) => identity.address !== address),
    ]);
  }, []);

  const forget = useCallback((address: string) => {
    write(getSnapshot().filter((identity) => identity.address !== address));
  }, []);

  return { identities, remember, forget };
}
