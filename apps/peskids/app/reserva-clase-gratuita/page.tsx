'use client';

import { useState } from 'react';
import { ReservaClaseForm } from '@/components/reserva-clase-form';

export default function ReservaClaseGratuitaPage() {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Reserva una Clase Gratuita
          </h1>
          <p className="text-lg text-gray-600">
            Descubre por qué somos la mejor opción de natación para niños en Medellín
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`mb-8 p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="font-medium">{notification.message}</p>
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">🏊</div>
            <h3 className="font-semibold text-lg mb-2">Clases Profesionales</h3>
            <p className="text-gray-600 text-sm">
              Instructores certificados con experiencia en enseñanza infantil
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">👨‍👩‍👧‍👦</div>
            <h3 className="font-semibold text-lg mb-2">Grupos Pequeños</h3>
            <p className="text-gray-600 text-sm">
              Atención personalizada para cada estudiante
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">🌟</div>
            <h3 className="font-semibold text-lg mb-2">Resultados Probados</h3>
            <p className="text-gray-600 text-sm">
              Miles de niños han aprendido a nadar con nosotros
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Completa el formulario
          </h2>
          <ReservaClaseForm
            onSuccess={(message) => {
              setNotification({ type: 'success', message });
              setTimeout(() => setNotification(null), 5000);
            }}
            onError={(message) => {
              setNotification({ type: 'error', message });
              setTimeout(() => setNotification(null), 5000);
            }}
          />
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-600 text-sm">
          <p>¿Preguntas? Contáctanos:</p>
          <p className="font-medium text-gray-900">📧 hola@peskids.co</p>
          <p className="font-medium text-gray-900">📱 +57 (4) 3123-1234</p>
        </div>
      </div>
    </div>
  );
}
