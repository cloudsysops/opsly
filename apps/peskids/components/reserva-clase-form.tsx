'use client';

import { useState } from 'react';
import { type ReservaClaseGratuitaInput } from '@/lib/schemas/booking';

interface ReservaClaseFormProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function ReservaClaseForm({ onSuccess, onError }: ReservaClaseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ReservaClaseGratuitaInput>>({
    fuente_origen: 'website',
    ubicacion: 'llanogrande',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/reserva-clase-gratuita', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit booking');
      }

      const result = await response.json();
      onSuccess?.(result.data.message);
      setFormData({ fuente_origen: 'website', ubicacion: 'llanogrande' });
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto p-4">
      <div>
        <label htmlFor="nombre_completo" className="block text-sm font-medium mb-1">
          Nombre Completo
        </label>
        <input
          type="text"
          id="nombre_completo"
          name="nombre_completo"
          value={formData.nombre_completo || ''}
          onChange={handleChange}
          placeholder="Tu nombre"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          placeholder="tu@email.com"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="telefono" className="block text-sm font-medium mb-1">
          Teléfono
        </label>
        <input
          type="tel"
          id="telefono"
          name="telefono"
          value={formData.telefono || ''}
          onChange={handleChange}
          placeholder="+57 300 1234567"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="nombre_estudiante" className="block text-sm font-medium mb-1">
          Nombre del Estudiante
        </label>
        <input
          type="text"
          id="nombre_estudiante"
          name="nombre_estudiante"
          value={formData.nombre_estudiante || ''}
          onChange={handleChange}
          placeholder="Nombre del niño/a"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="grado_o_edad" className="block text-sm font-medium mb-1">
          Grado o Edad
        </label>
        <input
          type="text"
          id="grado_o_edad"
          name="grado_o_edad"
          value={formData.grado_o_edad || ''}
          onChange={handleChange}
          placeholder="Ej: 3° básico, 8 años"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="ubicacion" className="block text-sm font-medium mb-1">
          Ubicación Preferida
        </label>
        <select
          id="ubicacion"
          name="ubicacion"
          value={formData.ubicacion || 'llanogrande'}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="llanogrande">Llanogrande</option>
          <option value="domicilio">Domicilio</option>
        </select>
      </div>

      <div>
        <label htmlFor="fuente_origen" className="block text-sm font-medium mb-1">
          ¿Cómo nos encontraste?
        </label>
        <select
          id="fuente_origen"
          name="fuente_origen"
          value={formData.fuente_origen || 'website'}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="website">Sitio Web</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="referencia">Referencia (Boca a Boca)</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div>
        <label htmlFor="barrio" className="block text-sm font-medium mb-1">
          Barrio (Opcional)
        </label>
        <input
          type="text"
          id="barrio"
          name="barrio"
          value={formData.barrio || ''}
          onChange={handleChange}
          placeholder="Barrio o zona"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="notas" className="block text-sm font-medium mb-1">
          Notas Adicionales (Opcional)
        </label>
        <textarea
          id="notas"
          name="notas"
          value={formData.notas || ''}
          onChange={handleChange}
          placeholder="Algún comentario adicional..."
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Procesando...' : 'Reservar Clase Gratuita'}
      </button>
    </form>
  );
}
