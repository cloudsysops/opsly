"use client";

import type { ReactElement } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RevenuePoint = { month: string; amount: number };

export function SuperAdminRevenueChart({
  data,
}: {
  data: RevenuePoint[];
}): ReactElement {
  if (data.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Sin datos de ingresos en el período.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    month: d.month,
    amount: Number(d.amount),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" stroke="#888" fontSize={11} />
          <YAxis stroke="#888" fontSize={11} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #333" }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Ingresos"]}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3, fill: "#22c55e" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
