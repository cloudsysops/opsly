import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JourneyPhaseRedirect({ params }: { params: Promise<{ phase: string }> }) {
  const { phase } = await params;
  redirect(`/portal/learning/journey/${phase}`);
}
