'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara');
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = canvasRef.current.toDataURL('image/jpeg');

        // TODO: Send to OCR API
        setScannedResult({
          player_name: 'Messi (ejemplo)',
          country: 'Argentina',
          number: 10,
          confidence: 0.95,
          card_type: 'player',
        });
      }
    }
  };

  const confirmScan = async () => {
    if (scannedResult) {
      try {
        const response = await fetch('/api/scan/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scannedResult),
        });
        const data = await response.json();
        alert(`✅ Se añadió ${scannedResult.player_name} a tu colección!`);
        setScannedResult(null);
      } catch (error) {
        console.error('Error confirming scan:', error);
      }
    }
  };

  return (
    <div className="p-6 bg-white">
      <h1 className="text-3xl font-bold text-indigo-900 mb-6">📷 Escanear Estampilla</h1>

      {!isCameraActive && !scannedResult && (
        <div className="text-center space-y-4">
          <div className="bg-blue-50 p-8 rounded-lg border-2 border-dashed border-blue-300">
            <p className="text-gray-600 mb-4">
              Apunta la cámara a una estampilla Panini para identificarla automáticamente.
            </p>
            <button
              onClick={startCamera}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition"
            >
              🎥 Abrir cámara
            </button>
          </div>
        </div>
      )}

      {isCameraActive && !scannedResult && (
        <div className="space-y-4">
          <div className="bg-black rounded-lg overflow-hidden aspect-square">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={640}
              className="hidden"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={capturePhoto}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition"
            >
              ✓ Capturar
            </button>
            <button
              onClick={() => setIsCameraActive(false)}
              className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition"
            >
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}

      {scannedResult && (
        <div className="space-y-4">
          <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-200">
            <h2 className="text-xl font-bold text-indigo-900 mb-2">
              {scannedResult.player_name}
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-sm text-gray-600">País</p>
                <p className="font-semibold">{scannedResult.country}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Número</p>
                <p className="font-semibold">#{scannedResult.number}</p>
              </div>
            </div>
            <div className="bg-white p-3 rounded text-center">
              <p className="text-sm text-gray-600">Confianza de identificación</p>
              <p className="text-lg font-bold text-green-600">
                {(scannedResult.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={confirmScan}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition"
            >
              ✓ Confirmar y añadir
            </button>
            <button
              onClick={() => {
                setScannedResult(null);
                setIsCameraActive(false);
              }}
              className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition"
            >
              ✕ Rechazar
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/chat"
          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-center"
        >
          💬 Volver al chat
        </Link>
        <Link
          href="/inventory"
          className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition text-center"
        >
          📚 Mi colección
        </Link>
      </div>
    </div>
  );
}
