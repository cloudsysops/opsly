'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DealPipelineChartProps {
  data: { stage: string; count: number; value: number }[];
}

export function DealPipelineChart({ data }: DealPipelineChartProps) {
  return (
    <div className="w-full h-96 bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Pipeline por Etapa</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stage" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#3b82f6" name="Cantidad" />
          <Bar dataKey="value" fill="#10b981" name="Valor (USD)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DealStageDistributionProps {
  data: { name: string; value: number }[];
}

export function DealStageDistribution({ data }: DealStageDistributionProps) {
  return (
    <div className="w-full h-80 bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Distribución por Etapa</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
