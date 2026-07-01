'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        setAccounts(data.data || []);
      } catch (error) {
        console.error('Error loading accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, []);

  const filtered = accounts.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.billing_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Cuentas</h1>
            <p className="text-gray-600">Gestiona todas tus cuentas</p>
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            Nueva Cuenta
          </button>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">Cargando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold">Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{account.name}</td>
                    <td className="px-4 py-3">{account.account_type}</td>
                    <td className="px-4 py-3 text-gray-600">{account.billing_email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                        {account.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
