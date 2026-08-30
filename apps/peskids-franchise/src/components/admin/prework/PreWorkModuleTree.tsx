"use client";

interface PreWorkModuleSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  sequence: number;
  isRequired: boolean;
  hasDraft: boolean;
  submissionCount: number;
  versionCount: number;
  formSchemaVersion: number;
}

interface PreWorkModuleTreeProps {
  modules: PreWorkModuleSummary[];
  selectedModuleId: string | null;
  onSelectModule: (id: string) => void;
}

export function PreWorkModuleTree({
  modules,
  selectedModuleId,
  onSelectModule,
}: PreWorkModuleTreeProps) {
  // Sort by sequence
  const sortedModules = [...modules].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Modules
      </h2>
      <div className="space-y-2">
        {sortedModules.map((module) => (
          <button
            key={module.id}
            onClick={() => onSelectModule(module.id)}
            className={`
              w-full text-left p-3 rounded-lg transition-colors
              ${
                selectedModuleId === module.id
                  ? "bg-brand-purple text-white"
                  : "hover:bg-gray-100"
              }
            `}
          >
            <div className="flex items-start gap-3">
              {/* Status indicator */}
              <div
                className={`
                  mt-1.5 w-2 h-2 rounded-full flex-shrink-0
                  ${
                    module.hasDraft
                      ? "bg-yellow-400"
                      : module.formSchemaVersion > 1
                      ? "bg-green-400"
                      : "bg-gray-300"
                  }
                `}
                title={
                  module.hasDraft
                    ? "Has unpublished draft"
                    : module.formSchemaVersion > 1
                    ? "Published"
                    : "Not yet configured"
                }
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`
                      text-xs font-medium px-1.5 py-0.5 rounded
                      ${
                        selectedModuleId === module.id
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    {module.sequence}
                  </span>
                  <span
                    className={`
                      font-medium truncate
                      ${
                        selectedModuleId === module.id
                          ? "text-white"
                          : "text-gray-900"
                      }
                    `}
                  >
                    {module.title}
                  </span>
                </div>

                <div
                  className={`
                    mt-1 text-xs flex items-center gap-3
                    ${
                      selectedModuleId === module.id
                        ? "text-white/70"
                        : "text-gray-500"
                    }
                  `}
                >
                  <span>v{module.formSchemaVersion}</span>
                  <span>{module.submissionCount} submissions</span>
                </div>
              </div>

              {/* Required badge */}
              {module.isRequired && (
                <span
                  className={`
                    text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0
                    ${
                      selectedModuleId === module.id
                        ? "bg-white/20 text-white"
                        : "bg-brand-purple/10 text-brand-purple"
                    }
                  `}
                >
                  Required
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-xs font-medium text-gray-500 mb-2">Status</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span>Published</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span>Has draft changes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span>Not configured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
