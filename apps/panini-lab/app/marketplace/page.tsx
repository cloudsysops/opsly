'use client';

import React from 'react';
import Link from 'next/link';

export default function MarketplacePage() {
  const listings = [
    { id: 1, marketplace: 'MercadoLibre', seller: 'tienda_oficial', price: 145, shipping: 10, rating: 4.8 },
    { id: 2, marketplace: 'Ebay', seller: 'sports_collector', price: 155, shipping: 20, rating: 4.9 },
    { id: 3, marketplace: 'Facebook', seller: 'vendedor_local', price: 140, shipping: 0, rating: 4.5 },
  ];

  return (
    <div className="p-6 bg-white">
      <h1 className="text-3xl font-bold text-indigo-900 mb-2">🛍️ Buscar Estampillas</h1>
      <p className="text-gray-600 mb-6">Comparamos precios en MercadoLibre, Ebay y Facebook</p>

      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
        <p className="font-semibold text-blue-900 mb-2">Messi - Variante Argentina #11</p>
        <div className="flex justify-between text-sm">
          <span className="text-blue-600">3 ofertas encontradas</span>
          <span className="text-green-600 font-bold">Mejor: $150</span>
        </div>
      </div>

      <div className="space-y-3">
        {listings.map((listing) => (
          <div key={listing.id} className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{listing.marketplace}</h3>
                <p className="text-sm text-gray-600">Vendedor: {listing.seller}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm text-gray-600">{listing.rating}/5</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">${listing.price}</p>
                <p className="text-xs text-gray-500">+ ${listing.shipping} envío</p>
              </div>
            </div>
            <button className="w-full bg-green-500 text-white py-2 rounded font-medium hover:bg-green-600 transition text-sm">
              💰 Comprar en {listing.marketplace}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/chat"
          className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition text-center"
        >
          💬 Buscar otra
        </Link>
        <Link
          href="/wishlist"
          className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition text-center"
        >
          ⭐ Deseos
        </Link>
      </div>
    </div>
  );
}
