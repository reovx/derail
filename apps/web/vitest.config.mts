import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * The frontend test suite — `SPEC-BELT-LEVELS.md` §4, L3.
 *
 * The requirement names tests on *both* sides, and the contract side was never
 * the gap: `derail_gate` ships 28 of them. This half covers the logic that
 * decides what a user is told — Horizon's unfunded-account answer, the payment
 * builder's account-state branch, and how a run's status reads on screen.
 *
 * Path aliases resolve from `tsconfig.json` rather than a duplicated block, so
 * `@/` cannot drift away from what the app itself resolves.
 *
 * The `threads` pool is not a preference. Vitest's default `forks` pool never
 * gets a worker to respond on this Windows toolchain — every file times out
 * after 60s with "Failed to start forks worker" and zero tests run.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    pool: "threads",
    // jsdom is the default because component tests need a DOM. Pure modules
    // opt back out with `// @vitest-environment node` — anything touching
    // stellar-sdk's Keypair must, since jsdom's Buffer comes from a different
    // realm and @noble/ed25519 rejects it as "not a Uint8Array".
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
