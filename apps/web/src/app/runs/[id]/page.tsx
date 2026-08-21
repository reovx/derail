import { permanentRedirect } from "next/navigation";

/**
 * The old address for a run — `SPEC-UI-UX.md` §3.3.
 *
 * The model's noun is *deployment*, so the route is `/deployments/[id]`. This
 * stays because a run URL is the thing people paste into a pull request or a
 * chat thread when a deploy goes wrong, and breaking those would undo the one
 * property that made the detail page worth building: that it is somewhere a
 * teammate can open, later.
 */
export default async function LegacyRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/deployments/${id}`);
}
