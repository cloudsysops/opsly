"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon,
  CreditCardIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

interface StripeStatus {
  hasAccount: boolean;
  accountId?: string;
  onboarded: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  processedAt: string | null;
  stripePaymentId: string | null;
  invoice: {
    invoiceNumber: string;
    period: string;
    totalAmount: number;
  };
}

interface PaymentSummary {
  totalPaid: number;
  thisYearTotal: number;
  paymentCount: number;
}

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; label: string }> = {
  SUCCEEDED: { icon: CheckCircleIcon, bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  PENDING: { icon: ClockIcon, bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  PROCESSING: { icon: ClockIcon, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
  FAILED: { icon: XCircleIcon, bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  REFUNDED: { icon: XCircleIcon, bg: 'bg-gray-100', text: 'text-gray-700', label: 'Refunded' },
};

export default function PaymentSetupPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'history'>('setup');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [stripeRes, paymentsRes] = await Promise.all([
        fetch("/api/franchisee/stripe/status"),
        fetch("/api/franchisee/payments/history"),
      ]);

      if (stripeRes.ok) {
        const data = await stripeRes.json();
        setStripeStatus(data);
      } else {
        const errorData = await stripeRes.json();
        setError(errorData.error || "Failed to fetch payment status");
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
        setPaymentSummary(data.summary || null);
      }
    } catch (err) {
      setError("Failed to load payment status");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupStripe() {
    setSetupLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/franchisee/stripe/setup", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to set up Stripe");
        return;
      }

      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else if (data.dashboardUrl) {
        window.open(data.dashboardUrl, "_blank");
      }
    } catch (err) {
      setError("Failed to set up Stripe Connect");
    } finally {
      setSetupLoading(false);
    }
  }

  async function openStripeDashboard() {
    try {
      const response = await fetch("/api/franchisee/stripe/dashboard", {
        method: "POST",
      });
      const data = await response.json();

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      setError("Failed to open Stripe dashboard");
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
          <CreditCardIcon className="h-8 w-8 text-brand-purple" />
          Payment Center
        </h1>
        <p className="mt-1 text-gray-600">
          Manage your payment method and view payment history
        </p>
      </div>

      {/* Summary Cards */}
      {paymentSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-500">Total Paid</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(paymentSummary.totalPaid)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <BanknotesIcon className="h-5 w-5 text-brand-purple" />
                <span className="text-sm text-gray-500">This Year</span>
              </div>
              <p className="text-2xl font-bold text-brand-navy">
                {formatCurrency(paymentSummary.thisYearTotal)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-500">Total Payments</span>
              </div>
              <p className="text-2xl font-bold text-gray-700">
                {paymentSummary.paymentCount}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex rounded-xl bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'setup'
              ? 'bg-white text-brand-navy shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BanknotesIcon className="w-4 h-4" />
          Payment Method
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-white text-brand-navy shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClockIcon className="w-4 h-4" />
          Payment History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'setup' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Stripe Connect Status Card */}
          <Card>
            <CardHeader className="bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-navy rounded-lg">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Stripe Connect
                  </h2>
                  <p className="text-sm text-gray-600">
                    Bank account for automatic royalty payments
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="py-6">
              {!stripeStatus?.hasAccount ? (
                // No account yet
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <BanknotesIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Set Up Payment Method
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Connect your bank account to enable automatic royalty payments
                    via ACH. This is a secure process powered by Stripe.
                  </p>
                  <button
                    onClick={handleSetupStripe}
                    disabled={setupLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy text-white font-medium rounded-lg hover:bg-brand-navy/90 transition-colors disabled:opacity-50"
                  >
                    {setupLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <BanknotesIcon className="h-5 w-5" />
                        Set Up Stripe Connect
                      </>
                    )}
                  </button>
                </div>
              ) : !stripeStatus.onboarded ? (
                // Account exists but not fully onboarded
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <ExclamationCircleIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Complete Your Setup
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Your Stripe account has been created but requires additional
                    information to activate payments.
                  </p>
                  <button
                    onClick={handleSetupStripe}
                    disabled={setupLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    {setupLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        Continue Setup
                        <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                      </>
                    )}
                  </button>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Setup Status
                    </h4>
                    <div className="space-y-2">
                      <StatusItem label="Account Created" completed={true} />
                      <StatusItem
                        label="Details Submitted"
                        completed={stripeStatus.detailsSubmitted || false}
                      />
                      <StatusItem
                        label="Charges Enabled"
                        completed={stripeStatus.chargesEnabled || false}
                      />
                      <StatusItem
                        label="Payouts Enabled"
                        completed={stripeStatus.payoutsEnabled || false}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Fully onboarded
                <div className="text-center py-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Payment Method Active
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Your bank account is connected and ready to receive royalty
                    payment requests via ACH.
                  </p>
                  <button
                    onClick={openStripeDashboard}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    View Stripe Dashboard
                    <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  </button>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="space-y-2">
                      <StatusItem label="Account Created" completed={true} />
                      <StatusItem label="Details Submitted" completed={true} />
                      <StatusItem label="Charges Enabled" completed={true} />
                      <StatusItem label="Payouts Enabled" completed={true} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                How Royalty Payments Work
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <span className="text-sm text-blue-800">
                    Monthly invoices are generated based on your revenue data
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <span className="text-sm text-blue-800">
                    You&apos;ll receive an email to review and approve each invoice
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <span className="text-sm text-blue-800">
                    Approved invoices are collected via ACH from your connected bank
                    account
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  <span className="text-sm text-blue-800">
                    ACH payments typically settle within 3-5 business days
                  </span>
                </li>
              </ul>

              <div className="mt-6 pt-6 border-t border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Payment Security
                </h4>
                <p className="text-sm text-blue-800">
                  All payment processing is handled by Stripe, a PCI-compliant payment
                  processor. Your bank details are never stored on our servers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Payment History</h2>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">No payments yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your payment history will appear here once you start making payments.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => {
                  const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${status.bg}`}>
                          <StatusIcon className={`h-5 w-5 ${status.text}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {payment.invoice.period}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.invoice.invoiceNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.method === 'ACH' ? 'ACH Transfer' : payment.method}
                          </p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {payment.processedAt ? formatDate(payment.processedAt) : 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </WideContainer>
  );
}

function StatusItem({
  label,
  completed,
}: {
  label: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {completed ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
      )}
      <span className={completed ? "text-gray-900" : "text-gray-500"}>
        {label}
      </span>
    </div>
  );
}
