'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface AccountMetricsProps {
  data: { month: string; active: number; prospects: number; revenue: number }[];
}

export function AccountGrowthChart({ data }: AccountMetricsProps) {
  return (
    <div className="w-full h-80 bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Crecimiento de Cuentas</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="active" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
          <Area type="monotone" dataKey="prospects" stackId="1" stroke="#10b981" fill="#10b981" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface RevenueChartProps {
  data: { month: string; revenue: number; target: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="w-full h-80 bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Revenue vs Target</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
          <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Target" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
