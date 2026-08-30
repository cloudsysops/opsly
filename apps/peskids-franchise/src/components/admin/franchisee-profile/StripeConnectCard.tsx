"use client";

import React, { useState } from "react";
import {
  CreditCardIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface StripeConnectCardProps {
  franchisee: {
    id: string;
    franchiseeAccount?: {
      stripeAccountId?: string | null;
      stripeOnboarded: boolean;
      stripeOnboardedAt?: string | Date | null;
    } | null;
  };
  onSetupStripe?: () => Promise<string | null>;
}

export default function StripeConnectCard({
  franchisee,
  onSetupStripe,
}: StripeConnectCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const account = franchisee.franchiseeAccount;

  const handleSetup = async () => {
    if (!onSetupStripe) return;
    setIsLoading(true);
    try {
      const url = await onSetupStripe();
      if (url) {
        window.open(url, "_blank");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDashboard = async () => {
    if (!account?.stripeAccountId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stripe/connect?accountId=${account.stripeAccountId}&action=dashboard`);
      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5 text-gray-400" />
          Stripe Connect
        </h3>
      </div>

      {account?.stripeOnboarded ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Stripe account connected</p>
              <p className="text-sm text-green-700 mt-0.5">
                Payments can be collected via ACH debit from this franchisee.
              </p>
              {account.stripeOnboardedAt && (
                <p className="text-xs text-green-600 mt-2">
                  Connected on {new Date(account.stripeOnboardedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDashboard}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Open Stripe Dashboard
            </button>
          </div>

          {account.stripeAccountId && (
            <p className="text-xs text-gray-500">
              Account ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{account.stripeAccountId}</code>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
            <ExclamationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Stripe setup required</p>
              <p className="text-sm text-amber-700 mt-0.5">
                The franchisee needs to complete Stripe onboarding before payments can be collected.
              </p>
            </div>
          </div>

          {onSetupStripe && (
            <button
              onClick={handleSetup}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                "Generating link..."
              ) : (
                <>
                  <CreditCardIcon className="h-4 w-4" />
                  Start Stripe Setup
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
