import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function JourneyPhaseRedirect({ params }: { params: { phase: string } }) {
  redirect(`/portal/learning/journey/${params.phase}`);
}
