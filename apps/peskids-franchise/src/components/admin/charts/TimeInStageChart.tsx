"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface StageTime {
  stage: string;
  label: string;
  avgDays: number;
}

interface TimeInStageChartProps {
  data: StageTime[];
}

const COLORS = [
  "#F79A30", // brand-orange
  "#FACC29", // brand-yellow
  "#50C8DF", // brand-cyan
  "#6A469D", // brand-purple
  "#2D2F8E", // brand-navy
  "#34B256", // brand-green
];

export default function TimeInStageChart({ data }: TimeInStageChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal />
          <XAxis
            type="number"
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            unit=" days"
          />
          <YAxis
            dataKey="label"
            type="category"
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value) => value !== undefined ? [`${Number(value).toFixed(1)} days`, "Avg. Time"] : null}
            labelFormatter={(label) => `Stage: ${label}`}
          />
          <Bar dataKey="avgDays" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
