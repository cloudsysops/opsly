"use client";

import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface FunnelStep {
  stage: string;
  label: string;
  count: number;
  dropoff: number;
  conversionRate: number;
}

interface ConversionFunnelProps {
  data: FunnelStep[];
}

const COLORS = [
  "#2D2F8E", // brand-navy
  "#6A469D", // brand-purple
  "#50C8DF", // brand-cyan
  "#F79A30", // brand-orange
  "#FACC29", // brand-yellow
  "#34B256", // brand-green
  "#3a3c9e",
  "#34B256", // brand-green for selected
];

export default function ConversionFunnel({ data }: ConversionFunnelProps) {
  const chartData = data.map((step, index) => ({
    ...step,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip
            content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const item = payload[0].payload as FunnelStep;
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-600">
                    Count: <span className="font-medium">{item.count}</span>
                  </p>
                  {item.dropoff > 0 && (
                    <p className="text-sm text-red-500">
                      Dropoff: <span className="font-medium">-{item.dropoff}</span>
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    Conversion: <span className="font-medium">{item.conversionRate}%</span>
                  </p>
                </div>
              );
            }}
          />
          <Funnel
            dataKey="count"
            data={chartData}
            isAnimationActive
          >
            <LabelList
              position="center"
              fill="#fff"
              fontSize={12}
              fontWeight="bold"
              dataKey="count"
            />
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {chartData.map((item, index) => (
          <div key={item.stage} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
