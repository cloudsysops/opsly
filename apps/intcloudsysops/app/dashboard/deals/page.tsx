'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

export default function DealsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/deals').then(r => r.json()).then(d => {
      setData(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold capitalize">deals</h1>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">
            <Plus className="w-5 h-5" /> Nuevo
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6 flex gap-2">
            <input type="text" placeholder="Buscar..." className="flex-1 px-4 py-2 border rounded-lg" />
          </div>
          
          {loading ? <div className="text-center py-12">Cargando...</div> : (
            <div className="text-center py-12 text-gray-500">
              {data.length === 0 ? 'No hay registros' : `Total: ${data.length} registros`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
