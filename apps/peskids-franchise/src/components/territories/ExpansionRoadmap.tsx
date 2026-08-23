"use client";

interface Territory {
  id: string;
  name: string;
  state: string;
  status: string;
  territoryScore?: number | null;
}

interface ExpansionRoadmapProps {
  territories: Territory[];
}

const PIPELINE_STAGES = [
  { status: "COMING_SOON", label: "Research", color: "border-purple-400 bg-purple-50" },
  { status: "AVAILABLE", label: "Available", color: "border-green-400 bg-green-50" },
  { status: "RESERVED", label: "Reserved", color: "border-amber-400 bg-amber-50" },
  { status: "SOLD", label: "Sold", color: "border-blue-400 bg-blue-50" },
  { status: "ACTIVE", label: "Active", color: "border-cyan-400 bg-cyan-50" },
];

export default function ExpansionRoadmap({
  territories,
}: ExpansionRoadmapProps) {
  const getTerritoriesForStage = (status: string) =>
    territories.filter((t) => t.status === status);

  const totalCount = territories.length;
  const statusCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: getTerritoriesForStage(s.status).length,
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">
        Expansion Roadmap
      </h3>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-2">
        {statusCounts.map((stage) => (
          <div
            key={stage.status}
            className="text-center bg-gray-50 rounded-lg p-2"
          >
            <p className="text-lg font-bold text-gray-900">{stage.count}</p>
            <p className="text-[10px] text-gray-500">{stage.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline columns */}
      <div className="grid grid-cols-5 gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const stageTerritories = getTerritoriesForStage(stage.status);
          return (
            <div key={stage.status}>
              <div
                className={`border-t-2 ${stage.color.split(" ")[0]} px-2 py-1.5 rounded-t-lg`}
              >
                <p className="text-[10px] font-semibold text-gray-700">
                  {stage.label} ({stageTerritories.length})
                </p>
              </div>
              <div
                className={`${stage.color.split(" ")[1]} rounded-b-lg p-1.5 space-y-1 min-h-[60px]`}
              >
                {stageTerritories.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded px-2 py-1.5 shadow-sm"
                  >
                    <p className="text-[10px] font-medium text-gray-900 truncate">
                      {t.name}
                    </p>
                    <p className="text-[9px] text-gray-500">{t.state}</p>
                    {t.territoryScore != null && (
                      <span className="text-[9px] font-medium text-brand-navy">
                        Score: {t.territoryScore}
                      </span>
                    )}
                  </div>
                ))}
                {stageTerritories.length === 0 && (
                  <p className="text-[9px] text-gray-400 text-center py-2">
                    None
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        {totalCount} territories across {PIPELINE_STAGES.length} stages
      </p>
    </div>
  );
}
