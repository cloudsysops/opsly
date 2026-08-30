"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";

// Dynamic imports to avoid SSR issues with recharts
const ConversionFunnel = dynamic(
  () => import("@/components/admin/charts/ConversionFunnel"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const TimeSeriesChart = dynamic(
  () => import("@/components/admin/charts/TimeSeriesChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const TimeInStageChart = dynamic(
  () => import("@/components/admin/charts/TimeInStageChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const CohortTable = dynamic(
  () => import("@/components/admin/charts/CohortTable"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return (
    <div className="h-[300px] w-full flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-slate-200" />
        <div className="h-3 w-24 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

interface FunnelStep {
  stage: string;
  label: string;
  count: number;
  dropoff: number;
  conversionRate: number;
}

interface TimeSeriesPoint {
  date: string;
  inquiries: number;
  conversions: number;
}

interface StageTime {
  stage: string;
  label: string;
  avgDays: number;
}

interface CohortData {
  period: string;
  totalInquiries: number;
  toInitialContact: number;
  toDiscoveryCall: number;
  toPreWork: number;
  toSelected: number;
}

interface AnalyticsChartsProps {
  funnelData: FunnelStep[];
  timeSeriesData: TimeSeriesPoint[];
  timeInStageData: StageTime[];
  cohortData: CohortData[];
}

export default function AnalyticsCharts({
  funnelData,
  timeSeriesData,
  timeInStageData,
  cohortData,
}: AnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      {/* Visual Conversion Funnel */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Visual Conversion Funnel
          </h2>
        </CardHeader>
        <CardContent>
          <ConversionFunnel data={funnelData} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Time Series Trends */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Weekly Trends
            </h2>
          </CardHeader>
          <CardContent>
            {timeSeriesData.length > 0 ? (
              <TimeSeriesChart data={timeSeriesData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                Not enough data to show trends
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time in Stage */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Average Time in Stage
            </h2>
          </CardHeader>
          <CardContent>
            {timeInStageData.some((d) => d.avgDays > 0) ? (
              <TimeInStageChart data={timeInStageData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                Not enough data to show stage timing
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Cohort Analysis
          </h2>
        </CardHeader>
        <CardContent>
          {cohortData.length > 0 ? (
            <CohortTable data={cohortData} />
          ) : (
            <div className="py-8 text-center text-slate-500">
              Not enough data to show cohort analysis
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
