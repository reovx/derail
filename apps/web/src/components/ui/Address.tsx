"use client";

import { useState } from "react";

import { nameFor } from "@/lib/gate/roster";
import { explorerAccountUrl } from "@/lib/stellar/config";

export function truncateAddress(address: string, lead = 6, tail = 6) {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/**
 * Addresses are always mono, always copyable, always linked out.
 *
 * When the roster names the address, the name leads and the truncated address
 * follows in muted mono — a teammate is recognised by name, and the address is
 * still there to verify against. `name={false}` opts out where the name would be
 * noise (e.g. a row already grouped under that person).
 */
export function Address({
  address,
  full = false,
  link = true,
  name = true,
}: {
  address: string;
  full?: boolean;
  link?: boolean;
  name?: boolean;
}) {
  const label = name ? nameFor(address) : null;

  return (
    <span className="inline-flex items-center gap-2">
      {label && <span className="text-small font-medium text-foreground">{label}</span>}
      <span
        className={`font-mono break-all ${label ? "text-micro text-muted" : "text-small text-secondary"}`}
        title={full ? undefined : address}
      >
        {full ? address : truncateAddress(address)}
      </span>
      <CopyButton value={address} label="address" />
      {link && (
        <a
          href={explorerAccountUrl(address)}
          target="_blank"
          rel="noreferrer"
          className="text-muted transition-colors hover:text-foreground"
          aria-label="View account on Stellar Explorer"
          title="View on Stellar Explorer"
        >
          <ExternalIcon />
        </a>
      )}
    </span>
  );
}

export function CopyButton({ value, label = "value" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          // Clipboard can be blocked by permissions policy; the value is
          // selectable on screen either way, so this stays silent.
        }
      }}
      className="text-muted transition-colors hover:text-foreground"
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="5.5"
        y="5.5"
        width="8"
        height="8"
        rx="1.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10.5 3.5v-.25A1.75 1.75 0 0 0 8.75 1.5h-5.5A1.75 1.75 0 0 0 1.5 3.25v5.5c0 .966.784 1.75 1.75 1.75h.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="var(--status-success)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 3.5h-3A1.5 1.5 0 0 0 2 5v7.5A1.5 1.5 0 0 0 3.5 14H11a1.5 1.5 0 0 0 1.5-1.5v-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M9.5 2.5H14V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 3 7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
