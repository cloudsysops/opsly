import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PhaseRedirect({ params }: { params: Promise<{ programSlug: string; phaseSlug: string }> }) {
  const { programSlug, phaseSlug } = await params;
  redirect(`/portal/learning/${programSlug}/${phaseSlug}`);
}
