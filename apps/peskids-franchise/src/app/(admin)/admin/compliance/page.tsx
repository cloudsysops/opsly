export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatusFromDays(days: number | null, isExpired: boolean): 'active' | 'expiring' | 'expired' | 'none' {
  if (isExpired || (days !== null && days < 0)) return 'expired';
  if (days !== null && days <= 30) return 'expiring';
  if (days !== null || isExpired === false) return 'active';
  return 'none';
}

export default async function CompliancePage() {
  const session = await auth();
  if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
    redirect('/');
  }

  // Get all certifications
  const certifications = await db.certification.findMany({
    orderBy: [
      { requiredForLaunch: 'desc' },
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  // Get all franchisee accounts with their certifications
  const franchisees = await db.franchiseeAccount.findMany({
    include: {
      prospect: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          pipelineStage: true,
          selectedAt: true,
        },
      },
      certifications: {
        include: {
          certification: true,
        },
      },
    },
  });

  // Filter to only selected franchisees
  const selectedFranchisees = franchisees.filter(
    (f) => f.prospect.pipelineStage === 'SELECTED'
  );

  // Calculate compliance stats
  let fullyCompliant = 0;
  let partiallyCompliant = 0;
  let nonCompliant = 0;
  let expiringCerts = 0;
  let expiredCerts = 0;

  const franchiseeCompliance = selectedFranchisees.map((franchisee) => {
    const requiredCerts = certifications.filter((c) => c.requiredForLaunch);
    const earnedCerts = franchisee.certifications.filter(
      (fc) => fc.status === 'ACTIVE' || fc.status === 'EXPIRING_SOON'
    );
    const earnedCertIds = new Set(earnedCerts.map((ec) => ec.certificationId));

    const requiredComplete = requiredCerts.filter((c) => earnedCertIds.has(c.id)).length;
    const requiredTotal = requiredCerts.length;
    const completionRate = requiredTotal > 0 ? (requiredComplete / requiredTotal) * 100 : 0;

    // Check for expiring/expired
    const expiringItems = franchisee.certifications.filter((fc) => {
      if (!fc.expiresAt) return false;
      const days = daysUntil(fc.expiresAt);
      return days !== null && days > 0 && days <= 30;
    });

    const expiredItems = franchisee.certifications.filter((fc) => {
      if (fc.status === 'EXPIRED') return true;
      if (!fc.expiresAt) return false;
      const days = daysUntil(fc.expiresAt);
      return days !== null && days < 0;
    });

    expiringCerts += expiringItems.length;
    expiredCerts += expiredItems.length;

    if (completionRate === 100 && expiredItems.length === 0) {
      fullyCompliant++;
    } else if (completionRate > 0) {
      partiallyCompliant++;
    } else {
      nonCompliant++;
    }

    return {
      ...franchisee,
      requiredComplete,
      requiredTotal,
      completionRate,
      expiringItems,
      expiredItems,
    };
  });

  // Group certifications by category
  const certsByCategory = certifications.reduce((acc, cert) => {
    const category = cert.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(cert);
    return acc;
  }, {} as Record<string, typeof certifications>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheckIcon className="h-7 w-7 text-green-600" />
            Compliance Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Track certifications and compliance requirements across {selectedFranchisees.length} franchisee{selectedFranchisees.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Fully Compliant</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{fullyCompliant}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{partiallyCompliant}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircleIcon className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Non-Compliant</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{nonCompliant}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Expiring Soon</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{expiringCerts}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Expired</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{expiredCerts}</div>
        </div>
      </div>

      {/* Alerts Section */}
      {(expiringCerts > 0 || expiredCerts > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Attention Required
          </h3>
          <div className="space-y-3">
            {franchiseeCompliance
              .filter((f) => f.expiringItems.length > 0 || f.expiredItems.length > 0)
              .map((franchisee) => (
                <div key={franchisee.id} className="bg-white rounded-lg p-4 border border-amber-200">
                  <div className="font-medium text-slate-900">
                    {franchisee.prospect.firstName} {franchisee.prospect.lastName}
                  </div>
                  <div className="mt-2 space-y-1">
                    {franchisee.expiredItems.map((item) => (
                      <div key={item.id} className="text-sm text-red-600 flex items-center gap-2">
                        <XCircleIcon className="h-4 w-4" />
                        {item.certification.name} - Expired
                      </div>
                    ))}
                    {franchisee.expiringItems.map((item) => {
                      const days = daysUntil(item.expiresAt);
                      return (
                        <div key={item.id} className="text-sm text-amber-600 flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          {item.certification.name} - Expires in {days} day{days !== 1 ? 's' : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Franchisee Compliance Grid */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Franchisee Compliance Status</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
                  Franchisee
                </th>
                {certifications.map((cert) => (
                  <th
                    key={cert.id}
                    className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[100px]"
                    title={cert.description || cert.name}
                  >
                    <div className="truncate max-w-[100px]">{cert.name}</div>
                    {cert.requiredForLaunch && (
                      <span className="text-red-500">*</span>
                    )}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {franchiseeCompliance.map((franchisee) => (
                <tr key={franchisee.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                    <div className="text-sm font-medium text-slate-900">
                      {franchisee.prospect.firstName} {franchisee.prospect.lastName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {franchisee.requiredComplete}/{franchisee.requiredTotal} required
                    </div>
                  </td>
                  {certifications.map((cert) => {
                    const earned = franchisee.certifications.find(
                      (fc) => fc.certificationId === cert.id
                    );
                    const status = earned
                      ? getStatusFromDays(
                          earned.expiresAt ? daysUntil(earned.expiresAt) : null,
                          earned.status === 'EXPIRED'
                        )
                      : 'none';

                    return (
                      <td key={cert.id} className="px-3 py-4 text-center">
                        {status === 'active' && (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                        )}
                        {status === 'expiring' && (
                          <ClockIcon className="h-5 w-5 text-amber-500 mx-auto" />
                        )}
                        {status === 'expired' && (
                          <XCircleIcon className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                        {status === 'none' && (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            franchisee.completionRate === 100
                              ? 'bg-green-500'
                              : franchisee.completionRate >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${franchisee.completionRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {Math.round(franchisee.completionRate)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {franchiseeCompliance.length === 0 && (
                <tr>
                  <td colSpan={certifications.length + 2} className="px-6 py-8 text-center text-slate-500">
                    No selected franchisees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <span className="text-red-500">*</span> Required for launch |
          <CheckCircleIcon className="h-4 w-4 text-green-500 inline-block mx-1" /> Active |
          <ClockIcon className="h-4 w-4 text-amber-500 inline-block mx-1" /> Expiring soon |
          <XCircleIcon className="h-4 w-4 text-red-500 inline-block mx-1" /> Expired
        </div>
      </div>

      {/* Certifications by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(certsByCategory).map(([category, certs]) => (
          <div key={category} className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-slate-400" />
              {category}
            </h3>
            <div className="space-y-3">
              {certs.map((cert) => (
                <div key={cert.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <div className="font-medium text-slate-900">
                      {cert.name}
                      {cert.requiredForLaunch && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    {cert.description && (
                      <div className="text-sm text-slate-500 mt-1">{cert.description}</div>
                    )}
                    {cert.renewalMonths && (
                      <div className="text-xs text-slate-400 mt-1">
                        Renewal: Every {cert.renewalMonths} months
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
