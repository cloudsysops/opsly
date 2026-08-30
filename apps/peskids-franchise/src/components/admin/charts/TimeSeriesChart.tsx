"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DataPoint {
  date: string;
  inquiries: number;
  conversions: number;
}

interface TimeSeriesChartProps {
  data: DataPoint[];
}

export default function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelStyle={{ fontWeight: 600, color: "#1e293b" }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="inquiries"
            name="New Inquiries"
            stroke="#50C8DF"
            strokeWidth={2}
            dot={{ fill: "#50C8DF", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: "#50C8DF" }}
          />
          <Line
            type="monotone"
            dataKey="conversions"
            name="Conversions"
            stroke="#34B256"
            strokeWidth={2}
            dot={{ fill: "#34B256", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: "#34B256" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
