/**
 * Talking to the ingest endpoint — SPEC-MVP1.md §7.2.
 *
 * The first non-negotiable: **never block the deploy.** Every call has a hard
 * timeout and every failure path is silent. A backend outage has to be
 * invisible to the person deploying, because the alternative is a wrapper
 * nobody keeps in front of their commands.
 */

const DEFAULT_URL = "https://derail-tau.vercel.app";

/**
 * The original budget was 2 seconds, on the principle that the wrapper must
 * never make a deploy slower. Measured against the real deployment, a round
 * trip takes 1.4–2.2s, so that budget dropped records at random — and a history
 * with silent holes is worse than no history, because it gets trusted.
 *
 * 5 seconds resolves the conflict rather than splitting it. The spawn call is
 * never awaited, so it still costs the deploy nothing; the completion call
 * happens *after* the child has already exited, so the only thing it can delay
 * is the shell prompt coming back. Paying that to keep the record whole is the
 * right trade, and it is a smaller cost than the rule was written to prevent.
 */
const TIMEOUT_MS = 5000;

export type ReportConfig = {
  url: string;
  token: string;
  debug: boolean;
};

export function readConfig(): ReportConfig | null {
  const token = process.env.DERAIL_TOKEN;
  if (!token) return null;

  return {
    url: (process.env.DERAIL_URL ?? DEFAULT_URL).replace(/\/+$/, ""),
    token,
    debug: Boolean(process.env.DERAIL_DEBUG),
  };
}

/** Never throws, never rejects. Returns whether the call landed. */
export async function report(
  config: ReportConfig,
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (config.debug) {
    process.stderr.write(`derail: POST ${config.url}/api/runs\n`);
    process.stderr.write(`derail: ${JSON.stringify(payload, null, 2)}\n`);
  }

  // The timeout is a controller we own rather than AbortSignal.timeout, because
  // that leaves a live timer behind. The wrapper exits the moment the child
  // does, and exiting with a pending handle trips a libuv assertion on Windows
  // — which would turn a silent best-effort report into a crash in front of
  // someone's deploy.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${config.url}/api/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
        // No keep-alive socket left open for the same reason.
        Connection: "close",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok && config.debug) {
      const body = await response.text().catch(() => "");
      process.stderr.write(`derail: ${response.status} ${body}\n`);
    }

    // The body has to be drained or the socket stays half-open.
    if (response.ok) await response.arrayBuffer().catch(() => undefined);

    return response.ok;
  } catch (error) {
    // Swallowed on purpose. DERAIL_DEBUG is the only way to see this, because
    // a wrapper that prints network noise into someone's deploy log is a
    // wrapper they remove.
    if (config.debug) {
      process.stderr.write(`derail: ${(error as Error).message}\n`);
    }
    return false;
  } finally {
    clearTimeout(timer);
  }
}
