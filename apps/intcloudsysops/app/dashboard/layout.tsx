'use client';

import Link from 'next/link';
import { BarChart3, Users, TrendingUp, MessageSquare, CheckCircle, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: '/dashboard', icon: BarChart3, label: 'Dashboard', exact: true },
    { href: '/dashboard/accounts', icon: Users, label: 'Cuentas' },
    { href: '/dashboard/deals', icon: TrendingUp, label: 'Deals' },
    { href: '/dashboard/contacts', icon: Users, label: 'Contactos' },
    { href: '/dashboard/feedback', icon: MessageSquare, label: 'Feedback' },
    { href: '/dashboard/followups', icon: CheckCircle, label: 'Seguimientos' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white shadow-lg">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold">ICSO CRM</h2>
          <p className="text-gray-400 text-sm mt-1">CloudOps Management</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-gray-800 rounded-lg">
            <LogOut className="w-5 h-5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
