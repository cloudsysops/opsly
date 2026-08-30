"use client";

import { useState } from "react";
import {
  CheckIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useCanvaConnection } from "@/hooks/useCanva";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface CanvaConnectionStatusProps {
  showDisconnect?: boolean;
}

export function CanvaConnectionStatus({
  showDisconnect = true,
}: CanvaConnectionStatusProps) {
  const { status, isLoading, disconnect } = useCanvaConnection();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await disconnect();
    setIsDisconnecting(false);
    setShowConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-sm">Checking Canva connection...</span>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <>
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">Canva Connected</p>
              {status.displayName && (
                <p className="text-sm text-green-700">
                  Connected as {status.displayName}
                </p>
              )}
            </div>
          </div>
          {showDisconnect && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isDisconnecting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDisconnecting ? (
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <XMarkIcon className="w-4 h-4" />
              )}
              Disconnect
            </button>
          )}
        </div>
        <ConfirmModal
          isOpen={showConfirm}
          title="Disconnect Canva"
          message="Are you sure you want to disconnect Canva? Existing Canva assets will keep their thumbnails but you won't be able to browse new designs."
          confirmLabel="Disconnect"
          confirmVariant="danger"
          onConfirm={handleDisconnect}
          onCancel={() => setShowConfirm(false)}
        />
      </>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <XMarkIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900">Canva Not Connected</p>
          <p className="text-sm text-gray-500">
            Connect to browse and embed Canva designs
          </p>
        </div>
      </div>
      <a
        href="/api/auth/canva"
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
      >
        Connect Canva
        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
      </a>
    </div>
  );
}
