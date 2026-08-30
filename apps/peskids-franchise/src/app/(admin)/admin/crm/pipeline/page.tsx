import { db } from "@/lib/db";
import { FullWidthContainer } from "@/components/shared/ResponsiveContainer";
import { PipelineBoard } from "@/components/admin/pipeline/PipelineBoard";
import { PipelineProspect } from "@/components/admin/pipeline/pipelineConfig";

export const dynamic = "force-dynamic";

const PIPELINE_STAGES = [
  "NEW_INQUIRY",
  "INITIAL_CONTACT",
  "DISCOVERY_CALL",
  "PRE_WORK_IN_PROGRESS",
  "PRE_WORK_COMPLETE",
  "INTERVIEW",
  "SELECTION_REVIEW",
] as const;

export default async function PipelinePage() {
  const prospects = await db.prospect.findMany({
    where: {
      pipelineStage: { in: [...PIPELINE_STAGES] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      preferredTerritory: true,
      pipelineStage: true,
      prospectScore: true,
      preWorkStatus: true,
      assignedTo: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const serialized: PipelineProspect[] = prospects.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    preferredTerritory: p.preferredTerritory,
    pipelineStage: p.pipelineStage,
    prospectScore: p.prospectScore,
    preWorkStatus: p.preWorkStatus || "",
    assignedTo: p.assignedTo,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <FullWidthContainer className="space-y-4 sm:space-y-6">
      <PipelineBoard initialProspects={serialized} />
    </FullWidthContainer>
  );
}
