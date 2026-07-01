'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BookOpen, TrendingUp, CheckCircle } from 'lucide-react';

export default function ParentDashboard() {
  const studentData = [
    { name: 'Student A', avgGrade: 9.0, attendance: 95, classesEnrolled: 2 },
    { name: 'Student B', avgGrade: 8.5, attendance: 92, classesEnrolled: 3 },
  ];

  const progressData = [
    { month: 'Ene', grade: 7.5 },
    { month: 'Feb', grade: 8.0 },
    { month: 'Mar', grade: 8.3 },
    { month: 'Abr', grade: 8.7 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Panel de Padres</h1>
        <p className="text-gray-600 mb-8">Monitorea el progreso académico de tu hijo</p>

        {/* Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900">¡Buen Progreso!</h3>
                <p className="text-green-700 text-sm">Calificación promedio: 8.7/10</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <BookOpen className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900">Clases Inscritas</h3>
                <p className="text-blue-700 text-sm">2 clases activas este semestre</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { title: 'Calificación Promedio', value: '8.7/10', change: '+0.4' },
            { title: 'Asistencia', value: '93%', change: '+2%' },
            { title: 'Tareas Completadas', value: '58/60', change: '+3' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm mb-2">{stat.title}</p>
              <p className="text-3xl font-bold mb-2">{stat.value}</p>
              <p className="text-green-600 text-sm flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> {stat.change} vs mes anterior
              </p>
            </div>
          ))}
        </div>

        {/* Progress Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Progreso Académico (Últimos 4 Meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="grade" stroke="#3b82f6" strokeWidth={2} name="Calificación Promedio" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Students Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Resumen por Estudiante</h3>
          <div className="space-y-4">
            {studentData.map((student, i) => (
              <div key={i} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold">{student.name}</h4>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">{student.classesEnrolled} clases</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Calificación Promedio</p>
                    <p className="text-2xl font-bold text-blue-600">{student.avgGrade.toFixed(1)}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Asistencia</p>
                    <p className="text-2xl font-bold text-green-600">{student.attendance}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
