"use client";

interface CohortData {
  period: string;
  totalInquiries: number;
  toInitialContact: number;
  toDiscoveryCall: number;
  toPreWork: number;
  toSelected: number;
}

interface CohortTableProps {
  data: CohortData[];
}

export default function CohortTable({ data }: CohortTableProps) {
  const getPercentage = (count: number, total: number) => {
    if (total === 0) return "0%";
    return `${Math.round((count / total) * 100)}%`;
  };

  const getColorClass = (count: number, total: number) => {
    if (total === 0) return "bg-slate-100";
    const percentage = (count / total) * 100;
    if (percentage >= 50) return "bg-brand-green/20 text-brand-green";
    if (percentage >= 30) return "bg-brand-cyan/20 text-brand-cyan";
    if (percentage >= 15) return "bg-brand-yellow/20 text-amber-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 font-semibold text-slate-700">
              Cohort
            </th>
            <th className="text-center py-3 px-3 font-semibold text-slate-700">
              Inquiries
            </th>
            <th className="text-center py-3 px-3 font-semibold text-slate-700">
              Initial Contact
            </th>
            <th className="text-center py-3 px-3 font-semibold text-slate-700">
              Discovery
            </th>
            <th className="text-center py-3 px-3 font-semibold text-slate-700">
              Pre-Work
            </th>
            <th className="text-center py-3 px-3 font-semibold text-slate-700">
              Selected
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((cohort, index) => (
            <tr
              key={cohort.period}
              className={index % 2 === 0 ? "bg-slate-50/50" : ""}
            >
              <td className="py-3 px-4 font-medium text-slate-900">
                {cohort.period}
              </td>
              <td className="py-3 px-3 text-center">
                <span className="font-semibold text-slate-900">
                  {cohort.totalInquiries}
                </span>
              </td>
              <td className="py-3 px-3 text-center">
                <span
                  className={`inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded-full text-xs font-medium ${getColorClass(
                    cohort.toInitialContact,
                    cohort.totalInquiries
                  )}`}
                >
                  {cohort.toInitialContact}{" "}
                  <span className="ml-1 opacity-70">
                    ({getPercentage(cohort.toInitialContact, cohort.totalInquiries)})
                  </span>
                </span>
              </td>
              <td className="py-3 px-3 text-center">
                <span
                  className={`inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded-full text-xs font-medium ${getColorClass(
                    cohort.toDiscoveryCall,
                    cohort.totalInquiries
                  )}`}
                >
                  {cohort.toDiscoveryCall}{" "}
                  <span className="ml-1 opacity-70">
                    ({getPercentage(cohort.toDiscoveryCall, cohort.totalInquiries)})
                  </span>
                </span>
              </td>
              <td className="py-3 px-3 text-center">
                <span
                  className={`inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded-full text-xs font-medium ${getColorClass(
                    cohort.toPreWork,
                    cohort.totalInquiries
                  )}`}
                >
                  {cohort.toPreWork}{" "}
                  <span className="ml-1 opacity-70">
                    ({getPercentage(cohort.toPreWork, cohort.totalInquiries)})
                  </span>
                </span>
              </td>
              <td className="py-3 px-3 text-center">
                <span
                  className={`inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded-full text-xs font-medium ${getColorClass(
                    cohort.toSelected,
                    cohort.totalInquiries
                  )}`}
                >
                  {cohort.toSelected}{" "}
                  <span className="ml-1 opacity-70">
                    ({getPercentage(cohort.toSelected, cohort.totalInquiries)})
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
