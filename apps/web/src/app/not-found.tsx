import Link from "next/link";

import { Page } from "@/components/layout/Page";

/**
 * §5.8 — never a bare 404.
 *
 * The two things that 404 here are a run and a proposal, and both are things
 * someone reached by following a link that was supposed to keep working. Saying
 * which list to go back to is the least the page can do.
 */
export default function NotFound() {
  return (
    <Page width="form">
      <div className="flex flex-col gap-5 py-12">
        <p className="text-micro font-medium uppercase tracking-[0.18em] text-muted">
          Nothing at this address
        </p>
        <h1 className="max-w-[20ch] text-h1 font-semibold tracking-tight">
          That record does not exist here.
        </h1>
        <p className="max-w-[68ch] text-body text-muted">
          Either it was never recorded against this project, or the id in the link is wrong. Both
          lists below are complete — a run that Derail captured is in one of them.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link
            href="/deployments"
            className="text-body text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Every deployment
          </Link>
          <Link
            href="/gate"
            className="text-body text-secondary underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Every proposal
          </Link>
          <Link
            href="/overview"
            className="text-body text-muted underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Overview
          </Link>
        </div>
      </div>
    </Page>
  );
}
