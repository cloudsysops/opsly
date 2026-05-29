'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function InventoryPage() {
  const [tournament] = useState('World Cup 2022');
  const [owned] = useState(327);
  const [total] = useState(620);

  return (
    <div className="p-6 bg-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-indigo-900 mb-2">📚 Mi Colección</h1>
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg p-6 text-white">
          <p className="text-lg font-semibold">{tournament}</p>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Progreso</p>
              <p className="text-3xl font-bold">{((owned / total) * 100).toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {owned}/{total}
              </p>
              <p className="text-sm opacity-90">estampillas</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-white/30 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(owned / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Estampillas Comunes</p>
          <p className="text-2xl font-bold text-blue-600">245</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Raras</p>
          <p className="text-2xl font-bold text-purple-600">82</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Equipos Completos</h2>
        <div className="grid grid-cols-2 gap-3">
          {['Argentina', 'Francia', 'Brasil', 'Alemania'].map((team) => (
            <div key={team} className="bg-green-50 p-3 rounded-lg">
              <p className="font-medium text-green-900">{team}</p>
              <p className="text-xs text-green-600">100% completo</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Equipos Incompletos</h2>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-gray-600 mb-2">Te faltan 5 estampillas de Argentina</p>
          <button className="w-full bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 transition">
            Ver lo que me falta
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/chat"
          className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition text-center"
        >
          💬 Preguntarle a BBC
        </Link>
        <Link
          href="/scan"
          className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition text-center"
        >
          📷 Escanear
        </Link>
      </div>
    </div>
  );
}
