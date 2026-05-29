'use client';

import React from 'react';
import Link from 'next/link';

export default function WishlistPage() {
  const wishlist = [
    { id: 1, player: 'Messi (variante)', country: 'Argentina', number: 11, bestPrice: 150 },
    { id: 2, player: 'Mbappé (club)', country: 'Francia', number: 15, bestPrice: 120 },
    { id: 3, player: 'Neymar', country: 'Brasil', number: 8, bestPrice: 180 },
  ];

  return (
    <div className="p-6 bg-white">
      <h1 className="text-3xl font-bold text-indigo-900 mb-6">⭐ Lista de Deseos</h1>

      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
        <p className="text-sm text-gray-600">
          Te faltan <strong>23 estampillas</strong> para completar tu colección
        </p>
      </div>

      <div className="space-y-3">
        {wishlist.map((item) => (
          <div
            key={item.id}
            className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{item.player}</h3>
                <p className="text-sm text-gray-600">
                  {item.country} • #{item.number}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">${item.bestPrice}</p>
                <p className="text-xs text-gray-500">mejor precio</p>
              </div>
            </div>
            <button className="w-full bg-blue-500 text-white py-2 rounded font-medium hover:bg-blue-600 transition text-sm">
              🔍 Ver ofertas
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/chat"
          className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition text-center"
        >
          💬 Hablar con BBC
        </Link>
        <Link
          href="/inventory"
          className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition text-center"
        >
          📚 Mi colección
        </Link>
      </div>
    </div>
  );
}
