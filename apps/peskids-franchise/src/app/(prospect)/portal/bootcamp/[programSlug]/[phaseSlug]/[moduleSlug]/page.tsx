import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ModuleRedirect({ params }: { params: { programSlug: string; phaseSlug: string; moduleSlug: string } }) {
  redirect(`/portal/learning/${params.programSlug}/${params.phaseSlug}/${params.moduleSlug}`);
}
