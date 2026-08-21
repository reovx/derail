"use client";

import Link from "next/link";

import { Pill } from "@/components/ui/Pill";
import { useGate } from "@/lib/gate/GateProvider";
import { proposalStatus, shortHash } from "@/lib/gate/presentation";

/**
 * The edge between the two halves of the product — `SPEC-UI-UX.md` §5.3.
 *
 * A run that uploaded a wasm and a proposal that carries that wasm hash are the
 * same change, seen from either end. Nothing else in the ecosystem can draw
 * that line, because nothing else holds both facts.
 *
 * Renders nothing unless a proposal genuinely carries one of the hashes this
 * run printed. A speculative "no matching proposal" panel would be noise on
 * every deploy that was never meant to be an upgrade.
 */
export function UpgradeLink({ candidates }: { candidates: string[] }) {
  const { state } = useGate();

  if (!state || candidates.length === 0) return null;

  const matches = state.proposals.filter((proposal) =>
    candidates.includes(proposal.wasmHash.toLowerCase()),
  );
  if (matches.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-[10px] border border-border bg-surface px-4 py-3.5">
      <h2 className="text-h2 font-semibold tracking-tight">This wasm went to the gate</h2>
      <p className="max-w-[68ch] text-body text-muted">
        The hash this run uploaded is the hash{" "}
        {matches.length === 1 ? "a proposal carries" : "these proposals carry"}. The commit below is
        the change the approvers were asked to sign for.
      </p>

      <ul className="flex flex-col gap-2">
        {matches.map((proposal) => {
          const meta = proposalStatus(proposal.status);
          return (
            <li key={proposal.id}>
              <Link
                href={`/gate/${proposal.id}`}
                className="flex flex-wrap items-center gap-3 text-small text-muted transition-colors hover:text-foreground"
              >
                <Pill tone={meta.tone}>{meta.label}</Pill>
                <span className="text-secondary">Proposal #{proposal.id}</span>
                <span className="font-mono">{shortHash(proposal.wasmHash, 12)}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
