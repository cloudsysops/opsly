'use client';

import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, TrendingUp, Star } from 'lucide-react';

export default function TeacherDashboard() {
  const classStats = [
    { className: 'Python 101', students: 25, avgGrade: 8.5, attendance: 92 },
    { className: 'Web Dev', students: 18, avgGrade: 8.2, attendance: 94 },
    { className: 'Data Science', students: 15, avgGrade: 8.8, attendance: 88 },
  ];

  const performanceData = [
    { week: 'Sem 1', submitted: 45, perfect: 8 },
    { week: 'Sem 2', submitted: 52, perfect: 12 },
    { week: 'Sem 3', submitted: 58, perfect: 15 },
    { week: 'Sem 4', submitted: 61, perfect: 18 },
  ];

  const gradeDistribution = [
    { name: 'A (90-100)', value: 35 },
    { name: 'B (80-89)', value: 40 },
    { name: 'C (70-79)', value: 20 },
    { name: 'D (60-69)', value: 5 },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Panel del Profesor</h1>
        <p className="text-gray-600 mb-8">Gestiona tus clases y monitorea el progreso de estudiantes</p>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Users, title: 'Estudiantes', value: '58', color: 'blue' },
            { icon: BookOpen, title: 'Clases Activas', value: '3', color: 'green' },
            { icon: TrendingUp, title: 'Promedio Calificación', value: '8.5', color: 'purple' },
            { icon: Star, title: 'Asistencia', value: '92%', color: 'yellow' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <stat.icon className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-gray-600 text-sm">{stat.title}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Entregas por Semana</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="submitted" stroke="#3b82f6" />
                <Line type="monotone" dataKey="perfect" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Distribución de Calificaciones</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={gradeDistribution} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                  {gradeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classes Table */}
        <div className="bg-white rounded-lg shadow mt-8 p-6">
          <h3 className="text-lg font-semibold mb-4">Mis Clases</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Clase</th>
                <th className="text-left px-4 py-3 font-semibold">Estudiantes</th>
                <th className="text-left px-4 py-3 font-semibold">Calificación Promedio</th>
                <th className="text-left px-4 py-3 font-semibold">Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {classStats.map((cls, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{cls.className}</td>
                  <td className="px-4 py-3">{cls.students}</td>
                  <td className="px-4 py-3">{cls.avgGrade.toFixed(1)}/10</td>
                  <td className="px-4 py-3">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">{cls.attendance}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
