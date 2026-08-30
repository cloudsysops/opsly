"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

interface AgreementData {
  hasAgreement: boolean;
  message?: string;
  agreement?: {
    id: string;
    agreementNumber: string;
    version: number;
    status: string;
    startDate: string;
    endDate: string;
    termYears: number;
    territoryDescription: string | null;
    exclusiveTerritory: boolean;
    initialFranchiseFee: number;
    royaltyPercent: number;
    brandFundPercent: number;
    systemsFeePercent: number;
    totalOngoingFees: number;
    renewalTermYears: number;
    renewalFee: number | null;
    renewalNoticeMonths: number;
    nonRenewalNoticeMonths: number;
    signedAt: string | null;
    signedBy: string | null;
    documentUrl: string | null;
  };
  metrics?: {
    daysUntilExpiry: number;
    yearsRemaining: number;
    isExpiringSoon: boolean;
    isExpired: boolean;
    renewalNoticeDeadline: string;
    nonRenewalNoticeDeadline: string;
    daysUntilRenewalNotice: number;
  };
  activeRenewal?: {
    id: string;
    renewalNumber: number;
    status: string;
    initiatedAt: string;
    responseDeadline: string | null;
    franchiseeIntent: string | null;
    franchiseeIntentAt: string | null;
    franchisorDecision: string | null;
  } | null;
  renewalHistory?: {
    id: string;
    renewalNumber: number;
    initiatedAt: string;
    status: string;
    effectiveDate: string | null;
    newTermYears: number | null;
    newEndDate: string | null;
    franchiseeIntent: string | null;
    franchiseeIntentAt: string | null;
    signedAt: string | null;
  }[];
  territories?: {
    id: string;
    name: string;
    state: string;
    city: string | null;
    zipCodes: string[];
    counties: string[];
    schoolDistricts: string[];
  }[];
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-800", label: "Draft" },
  PENDING_SIGNATURE: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Signature" },
  ACTIVE: { bg: "bg-green-100", text: "text-green-800", label: "Active" },
  RENEWAL_ELIGIBLE: { bg: "bg-blue-100", text: "text-blue-800", label: "Renewal Eligible" },
  RENEWAL_IN_PROGRESS: { bg: "bg-purple-100", text: "text-purple-800", label: "Renewal In Progress" },
  RENEWED: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Renewed" },
  TERMINATED: { bg: "bg-red-100", text: "text-red-800", label: "Terminated" },
  EXPIRED: { bg: "bg-gray-100", text: "text-gray-600", label: "Expired" },
  TRANSFERRED: { bg: "bg-orange-100", text: "text-orange-800", label: "Transferred" },
};

const RENEWAL_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING_NOTICE: { bg: "bg-gray-100", text: "text-gray-800", label: "Pending Notice" },
  NOTICE_SENT: { bg: "bg-blue-100", text: "text-blue-800", label: "Notice Sent" },
  AWAITING_RESPONSE: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Awaiting Your Response" },
  INTENT_RECEIVED: { bg: "bg-purple-100", text: "text-purple-800", label: "Response Received" },
  UNDER_REVIEW: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Under Review" },
  NEGOTIATING: { bg: "bg-orange-100", text: "text-orange-800", label: "Negotiating" },
  APPROVED: { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
  DECLINED: { bg: "bg-red-100", text: "text-red-800", label: "Declined" },
  NON_RENEWAL: { bg: "bg-gray-100", text: "text-gray-600", label: "Non-Renewal" },
  COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Completed" },
  TERMINATED: { bg: "bg-red-100", text: "text-red-800", label: "Terminated" },
  TRANSFERRED: { bg: "bg-orange-100", text: "text-orange-800", label: "Transferred" },
};

export default function FranchiseeAgreementPage() {
  const [data, setData] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "territory" | "renewals">("overview");

  useEffect(() => {
    fetchAgreement();
  }, []);

  async function fetchAgreement() {
    try {
      const res = await fetch("/api/franchisee/agreement");
      const json = await res.json();

      if (json.error) {
        setError(json.error);
        return;
      }

      setData(json);
    } catch (err) {
      console.error("Error fetching agreement:", err);
      setError("Failed to load agreement data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-xl" />
        </div>
      </WideContainer>
    );
  }

  if (error) {
    return (
      <WideContainer className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </WideContainer>
    );
  }

  if (!data?.hasAgreement || !data.agreement) {
    return (
      <WideContainer className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Agreement Found</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {data?.message || "Your franchise agreement is being prepared. Please contact us for more information."}
            </p>
            <a
              href="mailto:franchising@acmefranchise.com"
              className="inline-flex items-center mt-4 text-brand-purple hover:text-brand-purple/80"
            >
              Contact Franchising Team
            </a>
          </CardContent>
        </Card>
      </WideContainer>
    );
  }

  const { agreement, metrics, activeRenewal, renewalHistory, territories } = data;
  const status = STATUS_CONFIG[agreement.status] || STATUS_CONFIG.ACTIVE;

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
            Franchise Agreement
          </h1>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <span className="text-gray-600">{agreement.agreementNumber}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            {agreement.exclusiveTerritory && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <ShieldCheckIcon className="h-3.5 w-3.5 inline mr-1" />
                Exclusive Territory
              </span>
            )}
          </div>
        </div>
        {agreement.documentUrl && (
          <a
            href={agreement.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download Agreement
          </a>
        )}
      </div>

      {/* Expiry Warning */}
      {metrics && metrics.isExpiringSoon && (
        <Card className={`${metrics.isExpired ? 'border-red-300 bg-red-50' : metrics.daysUntilExpiry <= 180 ? 'border-amber-300 bg-amber-50' : 'border-blue-300 bg-blue-50'}`}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className={`h-6 w-6 flex-shrink-0 ${metrics.isExpired ? 'text-red-600' : metrics.daysUntilExpiry <= 180 ? 'text-amber-600' : 'text-blue-600'}`} />
              <div>
                <p className={`font-semibold ${metrics.isExpired ? 'text-red-800' : metrics.daysUntilExpiry <= 180 ? 'text-amber-800' : 'text-blue-800'}`}>
                  {metrics.isExpired
                    ? "Your agreement has expired"
                    : `Your agreement expires in ${metrics.daysUntilExpiry} days`}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {metrics.isExpired
                    ? "Please contact the franchising team immediately to discuss your options."
                    : `Renewal notice deadline: ${formatDate(metrics.renewalNoticeDeadline)}`}
                </p>
                {activeRenewal && (
                  <p className="text-sm font-medium text-brand-purple mt-2">
                    A renewal process is currently in progress. See the Renewals tab for details.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Renewal Notice */}
      {activeRenewal && activeRenewal.status === 'AWAITING_RESPONSE' && (
        <Card className="border-purple-300 bg-purple-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <ArrowPathIcon className="h-6 w-6 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-purple-800">Action Required: Renewal Response Needed</p>
                <p className="text-sm text-gray-600 mt-1">
                  Please respond to your renewal notice by {activeRenewal.responseDeadline ? formatDate(activeRenewal.responseDeadline) : 'the deadline'}.
                </p>
                <a
                  href="mailto:franchising@acmefranchise.com?subject=Franchise Renewal Response"
                  className="inline-flex items-center mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Respond to Renewal Notice
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDaysIcon className="h-5 w-5 text-brand-purple" />
              <span className="text-sm text-gray-500">Term Remaining</span>
            </div>
            <p className={`text-2xl font-bold ${metrics && metrics.isExpired ? 'text-red-600' : 'text-gray-900'}`}>
              {metrics ? (metrics.isExpired ? 'Expired' : `${metrics.yearsRemaining} years`) : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Expires {formatDate(agreement.endDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-500">Total Fees</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {agreement.totalOngoingFees}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              of gross revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <MapPinIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-500">Territories</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {territories?.length || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              assigned markets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-gray-500">Original Term</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {agreement.termYears} years
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Started {formatDate(agreement.startDate)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {[
            { id: "overview" as const, label: "Agreement Overview", icon: DocumentTextIcon },
            { id: "territory" as const, label: "Territory Details", icon: MapPinIcon },
            { id: "renewals" as const, label: "Renewal History", icon: ArrowPathIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-brand-purple text-brand-purple"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agreement Terms */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                Agreement Terms
              </h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Agreement Number</dt>
                  <dd className="font-medium text-gray-900">{agreement.agreementNumber}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Version</dt>
                  <dd className="font-medium text-gray-900">{agreement.version}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Start Date</dt>
                  <dd className="font-medium text-gray-900">{formatDate(agreement.startDate)}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">End Date</dt>
                  <dd className="font-medium text-gray-900">{formatDate(agreement.endDate)}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Term Length</dt>
                  <dd className="font-medium text-gray-900">{agreement.termYears} years</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Territory Type</dt>
                  <dd className="font-medium text-gray-900">
                    {agreement.exclusiveTerritory ? (
                      <span className="text-green-600">Exclusive</span>
                    ) : (
                      <span className="text-gray-600">Non-Exclusive</span>
                    )}
                  </dd>
                </div>
                {agreement.signedAt && (
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-500">Signed</dt>
                    <dd className="font-medium text-gray-900">
                      {formatDate(agreement.signedAt)}
                      {agreement.signedBy && ` by ${agreement.signedBy}`}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Financial Terms */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                Financial Terms
              </h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <dt className="text-gray-500">Initial Franchise Fee</dt>
                  <dd className="font-medium text-gray-900">
                    ${agreement.initialFranchiseFee.toLocaleString()}
                  </dd>
                </div>
                <div className="py-3 border-b border-gray-100">
                  <p className="text-sm text-gray-500 mb-3">Ongoing Fees (% of gross revenue)</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Royalty Fee</span>
                      <span className="font-semibold text-brand-purple">{agreement.royaltyPercent}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Brand Fund</span>
                      <span className="font-semibold text-blue-600">{agreement.brandFundPercent}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Systems Fee</span>
                      <span className="font-semibold text-green-600">{agreement.systemsFeePercent}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between py-2 bg-gray-50 px-3 rounded-lg">
                  <dt className="font-semibold text-gray-700">Total Ongoing Fees</dt>
                  <dd className="font-bold text-xl text-brand-navy">{agreement.totalOngoingFees}%</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Renewal Terms */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy flex items-center gap-2">
                <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                Renewal Terms
              </h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-brand-purple">{agreement.renewalTermYears}</p>
                  <p className="text-sm text-gray-500">Renewal Term (years)</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {agreement.renewalFee ? `$${agreement.renewalFee.toLocaleString()}` : 'TBD'}
                  </p>
                  <p className="text-sm text-gray-500">Renewal Fee</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{agreement.renewalNoticeMonths}</p>
                  <p className="text-sm text-gray-500">Months Notice (Renewal)</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{agreement.nonRenewalNoticeMonths}</p>
                  <p className="text-sm text-gray-500">Months Notice (Non-Renewal)</p>
                </div>
              </div>
              {metrics && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Important Dates:</strong> To renew your agreement, you must provide notice by{" "}
                    <span className="font-semibold">{formatDate(metrics.renewalNoticeDeadline)}</span>.
                    To opt out of renewal, notice is required by{" "}
                    <span className="font-semibold">{formatDate(metrics.nonRenewalNoticeDeadline)}</span>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "territory" && (
        <div className="space-y-6">
          {/* Territory Description */}
          {agreement.territoryDescription && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-brand-navy flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                  Territory Description
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{agreement.territoryDescription}</p>
              </CardContent>
            </Card>
          )}

          {/* Assigned Markets */}
          {territories && territories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {territories.map((territory) => (
                <Card key={territory.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <BuildingOffice2Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{territory.name}</h3>
                        <p className="text-sm text-gray-500">{territory.city ? `${territory.city}, ` : ''}{territory.state}</p>

                        {territory.zipCodes && territory.zipCodes.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Zip Codes</p>
                            <div className="flex flex-wrap gap-1">
                              {territory.zipCodes.slice(0, 10).map((zip) => (
                                <span key={zip} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                  {zip}
                                </span>
                              ))}
                              {territory.zipCodes.length > 10 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                                  +{territory.zipCodes.length - 10} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {territory.counties && territory.counties.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Counties</p>
                            <p className="text-sm text-gray-700">{territory.counties.join(", ")}</p>
                          </div>
                        )}

                        {territory.schoolDistricts && territory.schoolDistricts.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">School Districts</p>
                            <p className="text-sm text-gray-700">{territory.schoolDistricts.slice(0, 3).join(", ")}</p>
                            {territory.schoolDistricts.length > 3 && (
                              <p className="text-xs text-gray-500">+{territory.schoolDistricts.length - 3} more</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No specific markets assigned yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your territory details will be shown here once assigned.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Territory Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-800">Territory Protection</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {agreement.exclusiveTerritory
                      ? "Your territory is exclusive. Acme Franchise will not grant another franchise within your defined territory boundaries."
                      : "Your territory is non-exclusive. Other franchises may operate within the same area."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "renewals" && (
        <div className="space-y-6">
          {/* Active Renewal */}
          {activeRenewal && (
            <Card className="border-purple-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-brand-navy">Current Renewal Process</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${RENEWAL_STATUS_CONFIG[activeRenewal.status]?.bg || 'bg-gray-100'} ${RENEWAL_STATUS_CONFIG[activeRenewal.status]?.text || 'text-gray-800'}`}>
                    {RENEWAL_STATUS_CONFIG[activeRenewal.status]?.label || activeRenewal.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Renewal #</p>
                    <p className="font-medium text-gray-900">{activeRenewal.renewalNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Initiated</p>
                    <p className="font-medium text-gray-900">{formatDate(activeRenewal.initiatedAt)}</p>
                  </div>
                  {activeRenewal.responseDeadline && (
                    <div>
                      <p className="text-sm text-gray-500">Response Deadline</p>
                      <p className="font-medium text-gray-900">{formatDate(activeRenewal.responseDeadline)}</p>
                    </div>
                  )}
                  {activeRenewal.franchiseeIntent && (
                    <div>
                      <p className="text-sm text-gray-500">Your Response</p>
                      <p className="font-medium text-gray-900">{activeRenewal.franchiseeIntent.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>
                {activeRenewal.status === 'AWAITING_RESPONSE' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-800 font-medium">
                      Action Required: Please respond to your renewal notice.
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Contact <a href="mailto:franchising@acmefranchise.com" className="underline">franchising@acmefranchise.com</a> to submit your renewal intent.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Renewal History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">Renewal History</h2>
            </CardHeader>
            <CardContent>
              {renewalHistory && renewalHistory.length > 0 ? (
                <div className="space-y-4">
                  {renewalHistory.map((renewal) => {
                    const renewalStatus = RENEWAL_STATUS_CONFIG[renewal.status] || RENEWAL_STATUS_CONFIG.PENDING_NOTICE;
                    return (
                      <div
                        key={renewal.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-shrink-0">
                          {renewal.status === 'COMPLETED' ? (
                            <CheckCircleIcon className="h-8 w-8 text-green-500" />
                          ) : renewal.status === 'DECLINED' || renewal.status === 'TERMINATED' ? (
                            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                          ) : (
                            <ClockIcon className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">Renewal #{renewal.renewalNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${renewalStatus.bg} ${renewalStatus.text}`}>
                              {renewalStatus.label}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Initiated {formatDate(renewal.initiatedAt)}
                            {renewal.effectiveDate && ` • Effective ${formatDate(renewal.effectiveDate)}`}
                            {renewal.newTermYears && ` • ${renewal.newTermYears} year term`}
                          </div>
                        </div>
                        {renewal.signedAt && (
                          <div className="text-sm text-gray-500">
                            Signed {formatDate(renewal.signedAt)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ArrowPathIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No renewal history yet.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Renewal processes will appear here when initiated.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Renewal Info */}
          <Card className="bg-gray-50">
            <CardContent className="py-6">
              <h3 className="font-semibold text-gray-900 mb-2">About Renewals</h3>
              <p className="text-sm text-gray-600">
                Franchise agreements can be renewed for additional {agreement.renewalTermYears}-year terms.
                Renewal notice must be provided at least {agreement.renewalNoticeMonths} months before your
                agreement expires. If you do not wish to renew, you must notify us at least{" "}
                {agreement.nonRenewalNoticeMonths} months in advance. Questions about renewal?{" "}
                <a href="mailto:franchising@acmefranchise.com" className="text-brand-purple hover:underline">
                  Contact our team
                </a>.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </WideContainer>
  );
}
