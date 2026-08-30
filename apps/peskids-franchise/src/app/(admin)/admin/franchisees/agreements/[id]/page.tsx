"use client";

import { useState, useEffect, use } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { DefaultContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  MapPinIcon,
  PencilIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface Agreement {
  id: string;
  agreementNumber: string;
  version: number;
  startDate: string;
  endDate: string;
  termYears: number;
  territoryDescription: string | null;
  exclusiveTerritory: boolean;
  initialFranchiseFee: number;
  royaltyPercent: number;
  brandFundPercent: number;
  systemsFeePercent: number;
  renewalTermYears: number;
  renewalFee: number | null;
  renewalNoticeMonths: number;
  nonRenewalNoticeMonths: number;
  status: string;
  documentUrl: string | null;
  signedAt: string | null;
  signedBy: string | null;
  witnessedBy: string | null;
  franchiseeAccount: {
    id: string;
    prospect: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
    };
    markets: {
      id: string;
      name: string;
      state: string;
    }[];
  };
  renewals: Renewal[];
}

interface Renewal {
  id: string;
  renewalNumber: number;
  initiatedAt: string;
  initiatedBy: string;
  notificationSentAt: string | null;
  responseDeadline: string | null;
  effectiveDate: string | null;
  newTermYears: number | null;
  newEndDate: string | null;
  renewalFee: number | null;
  feeWaived: boolean;
  feeWaivedReason: string | null;
  newRoyaltyPercent: number | null;
  status: string;
  franchiseeIntent: string | null;
  franchiseeIntentAt: string | null;
  franchiseeNotes: string | null;
  franchisorDecision: string | null;
  franchisorDecisionAt: string | null;
  franchisorNotes: string | null;
  decisionBy: string | null;
  renewalAgreementUrl: string | null;
  signedAt: string | null;
  terminationReason: string | null;
  terminationEffectiveAt: string | null;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_SIGNATURE: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  RENEWAL_ELIGIBLE: "bg-blue-100 text-blue-800",
  RENEWAL_IN_PROGRESS: "bg-purple-100 text-purple-800",
  RENEWED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-800",
  TRANSFERRED: "bg-orange-100 text-orange-800",
};

const renewalStatusColors: Record<string, string> = {
  PENDING_NOTICE: "bg-gray-100 text-gray-800",
  NOTICE_SENT: "bg-blue-100 text-blue-800",
  AWAITING_RESPONSE: "bg-yellow-100 text-yellow-800",
  INTENT_RECEIVED: "bg-purple-100 text-purple-800",
  UNDER_REVIEW: "bg-indigo-100 text-indigo-800",
  NEGOTIATING: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  NON_RENEWAL: "bg-gray-100 text-gray-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-red-100 text-red-800",
  TRANSFERRED: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SIGNATURE: "Pending Signature",
  ACTIVE: "Active",
  RENEWAL_ELIGIBLE: "Renewal Eligible",
  RENEWAL_IN_PROGRESS: "Renewal In Progress",
  RENEWED: "Renewed",
  TERMINATED: "Terminated",
  EXPIRED: "Expired",
  TRANSFERRED: "Transferred",
};

const renewalStatusLabels: Record<string, string> = {
  PENDING_NOTICE: "Pending Notice",
  NOTICE_SENT: "Notice Sent",
  AWAITING_RESPONSE: "Awaiting Response",
  INTENT_RECEIVED: "Intent Received",
  UNDER_REVIEW: "Under Review",
  NEGOTIATING: "Negotiating",
  APPROVED: "Approved",
  DECLINED: "Declined",
  NON_RENEWAL: "Non-Renewal",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
  TRANSFERRED: "Transferred",
};

export default function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiatingRenewal, setInitiatingRenewal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState<Renewal | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAgreement();
  }, [id]);

  const fetchAgreement = async () => {
    try {
      const res = await fetch(`/api/admin/agreements/${id}`);
      const data = await res.json();
      setAgreement(data.agreement);
    } catch (error) {
      console.error("Failed to fetch agreement:", error);
    } finally {
      setLoading(false);
    }
  };

  const initiateRenewal = async () => {
    setInitiatingRenewal(true);
    try {
      const res = await fetch(`/api/admin/agreements/${id}/renewals`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      await fetchAgreement();
    } catch (error: any) {
      console.error("Failed to initiate renewal:", error);
      setAlertMsg(error.message || "Failed to initiate renewal");
    } finally {
      setInitiatingRenewal(false);
    }
  };

  const getDaysUntilExpiry = () => {
    if (!agreement) return 0;
    const end = new Date(agreement.endDate);
    const today = new Date();
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <DefaultContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DefaultContainer>
    );
  }

  if (!agreement) {
    return (
      <DefaultContainer>
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">Agreement not found</p>
          <Link
            href="/admin/franchisees/agreements"
            className="mt-4 inline-flex items-center text-brand-purple hover:text-brand-purple/80"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Agreements
          </Link>
        </div>
      </DefaultContainer>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry();
  const canInitiateRenewal =
    agreement.status === "ACTIVE" &&
    daysUntilExpiry <= 365 &&
    !agreement.renewals.some(
      (r) =>
        !["COMPLETED", "TERMINATED", "TRANSFERRED", "NON_RENEWAL", "DECLINED"].includes(r.status)
    );

  return (
    <DefaultContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/admin/franchisees/agreements"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Agreements
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {agreement.agreementNumber}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  statusColors[agreement.status]
                }`}
              >
                {statusLabels[agreement.status]}
              </span>
            </h1>
            <p className="text-gray-500 mt-1">Version {agreement.version}</p>
          </div>
          <div className="flex items-center gap-2">
            {canInitiateRenewal && (
              <button
                onClick={initiateRenewal}
                disabled={initiatingRenewal}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-50"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                {initiatingRenewal ? "Initiating..." : "Initiate Renewal"}
              </button>
            )}
          </div>
        </div>

        {/* Expiry Warning */}
        {daysUntilExpiry <= 180 && agreement.status === "ACTIVE" && (
          <div
            className={`rounded-lg p-4 ${
              daysUntilExpiry <= 0
                ? "bg-red-50 border border-red-200"
                : daysUntilExpiry <= 90
                ? "bg-orange-50 border border-orange-200"
                : "bg-yellow-50 border border-yellow-200"
            }`}
          >
            <div className="flex items-center">
              <ExclamationTriangleIcon
                className={`h-5 w-5 mr-2 ${
                  daysUntilExpiry <= 0
                    ? "text-red-500"
                    : daysUntilExpiry <= 90
                    ? "text-orange-500"
                    : "text-yellow-500"
                }`}
              />
              <p
                className={`font-medium ${
                  daysUntilExpiry <= 0
                    ? "text-red-800"
                    : daysUntilExpiry <= 90
                    ? "text-orange-800"
                    : "text-yellow-800"
                }`}
              >
                {daysUntilExpiry <= 0
                  ? "This agreement has expired!"
                  : `This agreement expires in ${daysUntilExpiry} days`}
              </p>
            </div>
            {daysUntilExpiry > 0 && (
              <p className="mt-1 text-sm text-gray-600 ml-7">
                Renewal notice should be sent at least {agreement.renewalNoticeMonths} months before
                expiration.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agreement Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-400" />
                Agreement Details
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Start Date</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(agreement.startDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">End Date</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(agreement.endDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Term Length</dt>
                  <dd className="text-sm font-medium text-gray-900">{agreement.termYears} years</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Exclusive Territory</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {agreement.exclusiveTerritory ? "Yes" : "No"}
                  </dd>
                </div>
                {agreement.territoryDescription && (
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">Territory Description</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {agreement.territoryDescription}
                    </dd>
                  </div>
                )}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <dt className="text-sm text-gray-500 mb-1">Signed</dt>
                  <dd className="text-sm text-gray-900">
                    {agreement.signedAt ? (
                      <>
                        {new Date(agreement.signedAt).toLocaleDateString()} by {agreement.signedBy}
                        {agreement.witnessedBy && ` (Witnessed by ${agreement.witnessedBy})`}
                      </>
                    ) : (
                      <span className="text-yellow-600">Not yet signed</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Financial Terms */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2 text-gray-400" />
                Financial Terms
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Initial Franchise Fee</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ${Number(agreement.initialFranchiseFee).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Royalty Fee</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {Number(agreement.royaltyPercent)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Brand Fund</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {Number(agreement.brandFundPercent)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Systems Fee</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {Number(agreement.systemsFeePercent)}%
                  </dd>
                </div>
                <div className="col-span-2 border-t pt-4 mt-2">
                  <dt className="text-sm text-gray-500 mb-1">Total Ongoing Fees</dt>
                  <dd className="text-xl font-bold text-brand-purple">
                    {(
                      Number(agreement.royaltyPercent) +
                      Number(agreement.brandFundPercent) +
                      Number(agreement.systemsFeePercent)
                    ).toFixed(1)}
                    %
                  </dd>
                </div>
              </dl>
            </div>

            {/* Renewal Terms */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ArrowPathIcon className="h-5 w-5 mr-2 text-gray-400" />
                Renewal Terms
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Renewal Term</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {agreement.renewalTermYears} years
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Renewal Fee</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {agreement.renewalFee
                      ? `$${Number(agreement.renewalFee).toLocaleString()}`
                      : "TBD"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Renewal Notice Period</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {agreement.renewalNoticeMonths} months
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Non-Renewal Notice Period</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {agreement.nonRenewalNoticeMonths} months
                  </dd>
                </div>
              </dl>
            </div>

            {/* Renewals History */}
            {agreement.renewals.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Renewal History</h2>
                <div className="space-y-4">
                  {agreement.renewals.map((renewal) => (
                    <div
                      key={renewal.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedRenewal(renewal);
                        setShowRenewalModal(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">
                            Renewal #{renewal.renewalNumber}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              renewalStatusColors[renewal.status]
                            }`}
                          >
                            {renewalStatusLabels[renewal.status]}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          Initiated {new Date(renewal.initiatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {renewal.effectiveDate && (
                        <p className="text-sm text-gray-500 mt-1">
                          Effective Date: {new Date(renewal.effectiveDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Franchisee Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                Franchisee
              </h2>
              <div className="space-y-3">
                <div>
                  <Link
                    href={`/admin/franchisees/${agreement.franchiseeAccount.id}`}
                    className="text-brand-purple hover:text-brand-purple/80 font-medium"
                  >
                    {agreement.franchiseeAccount.prospect.firstName}{" "}
                    {agreement.franchiseeAccount.prospect.lastName}
                  </Link>
                </div>
                <div className="text-sm text-gray-500">
                  {agreement.franchiseeAccount.prospect.email}
                </div>
                {agreement.franchiseeAccount.prospect.phone && (
                  <div className="text-sm text-gray-500">
                    {agreement.franchiseeAccount.prospect.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Markets */}
            {agreement.franchiseeAccount.markets.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Markets
                </h2>
                <ul className="space-y-2">
                  {agreement.franchiseeAccount.markets.map((market) => (
                    <li key={market.id} className="text-sm text-gray-900">
                      {market.name}, {market.state}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
              <div className="space-y-2">
                {agreement.documentUrl && (
                  <a
                    href={agreement.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View Document
                  </a>
                )}
                <Link
                  href={`/admin/franchisees/${agreement.franchiseeAccount.id}`}
                  className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Franchisee Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!alertMsg}
        title="Notice"
        message={alertMsg || ""}
        confirmLabel="OK"
        cancelLabel=""
        confirmVariant="primary"
        onConfirm={() => setAlertMsg(null)}
        onCancel={() => setAlertMsg(null)}
      />

      {/* Renewal Detail Modal */}
      {showRenewalModal && selectedRenewal && (
        <RenewalDetailModal
          renewal={selectedRenewal}
          onClose={() => {
            setShowRenewalModal(false);
            setSelectedRenewal(null);
          }}
          onUpdate={() => {
            fetchAgreement();
            setShowRenewalModal(false);
            setSelectedRenewal(null);
          }}
        />
      )}
    </DefaultContainer>
  );
}

interface RenewalDetailModalProps {
  renewal: Renewal;
  onClose: () => void;
  onUpdate: () => void;
}

function RenewalDetailModal({ renewal, onClose, onUpdate }: RenewalDetailModalProps) {
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<string>(renewal.franchisorDecision || "");
  const [notes, setNotes] = useState(renewal.franchisorNotes || "");
  const [renewalAlertMsg, setRenewalAlertMsg] = useState<string | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const handleDecision = async () => {
    if (!decision) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/renewals/${renewal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          franchisorDecision: decision,
          franchisorNotes: notes,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update renewal");
      }

      onUpdate();
    } catch (error) {
      console.error("Failed to update renewal:", error);
      setRenewalAlertMsg("Failed to update renewal");
    } finally {
      setSaving(false);
    }
  };

  const completeRenewal = () => {
    setShowCompleteConfirm(true);
  };

  const doCompleteRenewal = async () => {
    setShowCompleteConfirm(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/renewals/${renewal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (!res.ok) {
        throw new Error("Failed to complete renewal");
      }

      onUpdate();
    } catch (error) {
      console.error("Failed to complete renewal:", error);
      setRenewalAlertMsg("Failed to complete renewal");
    } finally {
      setSaving(false);
    }
  };

  const isActionable = ["NOTICE_SENT", "INTENT_RECEIVED", "APPROVED"].includes(renewal.status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              Renewal #{renewal.renewalNumber}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  renewalStatusColors[renewal.status]
                }`}
              >
                {renewalStatusLabels[renewal.status]}
              </span>
              {renewal.signedAt && (
                <span className="text-sm text-gray-500">
                  Signed {new Date(renewal.signedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Timeline */}
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Initiated</dt>
                <dd className="text-sm font-medium">
                  {new Date(renewal.initiatedAt).toLocaleDateString()} by {renewal.initiatedBy}
                </dd>
              </div>
              {renewal.notificationSentAt && (
                <div>
                  <dt className="text-sm text-gray-500">Notice Sent</dt>
                  <dd className="text-sm font-medium">
                    {new Date(renewal.notificationSentAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {renewal.responseDeadline && (
                <div>
                  <dt className="text-sm text-gray-500">Response Deadline</dt>
                  <dd className="text-sm font-medium">
                    {new Date(renewal.responseDeadline).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {renewal.effectiveDate && (
                <div>
                  <dt className="text-sm text-gray-500">Effective Date</dt>
                  <dd className="text-sm font-medium">
                    {new Date(renewal.effectiveDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>

            {/* Franchisee Response */}
            {renewal.franchiseeIntent && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Franchisee Response</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900">
                    Intent: {renewal.franchiseeIntent.replace("_", " ")}
                  </p>
                  {renewal.franchiseeIntentAt && (
                    <p className="text-sm text-gray-500">
                      {new Date(renewal.franchiseeIntentAt).toLocaleDateString()}
                    </p>
                  )}
                  {renewal.franchiseeNotes && (
                    <p className="text-sm text-gray-600 mt-2">{renewal.franchiseeNotes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Franchisor Decision */}
            {renewal.franchisorDecision ? (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Franchisor Decision</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {renewal.franchisorDecision.replace(/_/g, " ")}
                  </p>
                  {renewal.franchisorDecisionAt && (
                    <p className="text-sm text-gray-500">
                      {new Date(renewal.franchisorDecisionAt).toLocaleDateString()} by{" "}
                      {renewal.decisionBy}
                    </p>
                  )}
                  {renewal.franchisorNotes && (
                    <p className="text-sm text-gray-600 mt-2">{renewal.franchisorNotes}</p>
                  )}
                </div>
              </div>
            ) : (
              isActionable && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Make Decision</h4>
                  <div className="space-y-4">
                    <div>
                      <select
                        value={decision}
                        onChange={(e) => setDecision(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                      >
                        <option value="">Select decision...</option>
                        <option value="APPROVE_RENEWAL">Approve Renewal</option>
                        <option value="APPROVE_WITH_CONDITIONS">Approve with Conditions</option>
                        <option value="DENY_RENEWAL">Deny Renewal</option>
                        <option value="APPROVE_TRANSFER">Approve Transfer</option>
                        <option value="TERMINATE">Terminate Agreement</option>
                      </select>
                    </div>
                    <div>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-purple focus:ring-brand-purple"
                      />
                    </div>
                    <button
                      onClick={handleDecision}
                      disabled={!decision || saving}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-purple rounded-md hover:bg-brand-purple/90 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Submit Decision"}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Complete Renewal */}
            {renewal.status === "APPROVED" && (
              <div className="border-t pt-4">
                <button
                  onClick={completeRenewal}
                  disabled={saving}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-4 w-4 inline mr-2" />
                  {saving ? "Processing..." : "Complete Renewal & Update Agreement"}
                </button>
              </div>
            )}
          </div>

          <ConfirmModal
            isOpen={!!renewalAlertMsg}
            title="Notice"
            message={renewalAlertMsg || ""}
            confirmLabel="OK"
            cancelLabel=""
            confirmVariant="primary"
            onConfirm={() => setRenewalAlertMsg(null)}
            onCancel={() => setRenewalAlertMsg(null)}
          />

          <ConfirmModal
            isOpen={showCompleteConfirm}
            title="Complete Renewal"
            message="Mark this renewal as completed? This will update the agreement end date."
            confirmLabel="Complete"
            confirmVariant="primary"
            onConfirm={doCompleteRenewal}
            onCancel={() => setShowCompleteConfirm(false)}
          />
        </div>
      </div>
    </div>
  );
}
