import { GATE_ID, TARGET_ID } from "./config";
import type { GateRef } from "./read";

/**
 * The services one gate governs.
 *
 * A gate is not limited to a single target — `derail_gate` holds the upgrade
 * authority for every target registered against it, and a team ships several.
 * Testers who ran five services against one gate asked for exactly this: "a
 * lightweight web dashboard for the pending queue rather than relying solely on
 * the CLI" (Marisol Enriquez), "a queue or assignment view would be a welcome
 * addition" (Wilfredo Ignacio), "i'd actually pay for a hosted version with a
 * real dashboard" (Katrina Abaya).
 *
 * The list is configuration: `NEXT_PUBLIC_DERAIL_SERVICES` is a JSON array of
 * `{ "id": "C...", "name": "billing-service" }`. Unset, it falls back to the one
 * pinned target, so a single-service deployment needs no extra configuration and
 * the queue still works — it just has one lane.
 */

export type Service = {
  /** The target contract this service's upgrades are gated behind. */
  targetId: string;
  /** A human name for the service — what a reviewer thinks of it as. */
  name: string;
};

function parseServices(): Service[] {
  const raw = process.env.NEXT_PUBLIC_DERAIL_SERVICES;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const out: Service[] = [];
        for (const entry of parsed) {
          const id = (entry as { id?: unknown })?.id;
          const name = (entry as { name?: unknown })?.name;
          if (typeof id === "string" && id) {
            out.push({ targetId: id, name: typeof name === "string" && name ? name : short(id) });
          }
        }
        if (out.length > 0) return out;
      }
    } catch {
      // A malformed list should not empty the queue. Fall through to the pinned
      // target, which is always a safe default.
    }
  }

  // The single pinned target — the pre-multi-service configuration, unchanged.
  if (TARGET_ID) return [{ targetId: TARGET_ID, name: "target" }];
  return [];
}

function short(id: string): string {
  return `${id.slice(0, 6)}…`;
}

export const SERVICES: readonly Service[] = parseServices();

/** Whether more than one service is configured — the queue is worth its own lane. */
export const isMultiService = SERVICES.length > 1;

/** The gate/target pair for a service, for the target-aware read helpers. */
export function refFor(service: Service): GateRef {
  return { gateId: GATE_ID ?? "", targetId: service.targetId };
}

/** The configured name for a target id, or a short form if it is not listed. */
export function serviceName(targetId: string): string {
  return SERVICES.find((service) => service.targetId === targetId)?.name ?? short(targetId);
}
