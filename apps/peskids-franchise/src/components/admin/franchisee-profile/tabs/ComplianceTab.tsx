"use client";

import React from "react";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { formatDate } from "@/lib/utils";

interface Certification {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  requiredForLaunch: boolean;
  category: string;
}

interface FranchiseeCertification {
  id: string;
  earnedAt: string | Date;
  expiresAt?: string | Date | null;
  status: string;
  documentUrl?: string | null;
  documentName?: string | null;
  certification: Certification;
}

interface ComplianceTabProps {
  franchisee: {
    id: string;
    franchiseeAccount?: {
      certifications?: FranchiseeCertification[];
    } | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircleIcon }> = {
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircleIcon },
  EXPIRING_SOON: { label: "Expiring Soon", color: "bg-amber-100 text-amber-800", icon: ClockIcon },
  EXPIRED: { label: "Expired", color: "bg-red-100 text-red-800", icon: XCircleIcon },
  REVOKED: { label: "Revoked", color: "bg-red-100 text-red-800", icon: XCircleIcon },
};

const CATEGORIES = ["TRAINING", "COMPLIANCE", "LEGAL", "INSURANCE", "OPERATIONS"];

export default function ComplianceTab({ franchisee }: ComplianceTabProps) {
  const certifications = franchisee.franchiseeAccount?.certifications || [];

  // Group by category
  const byCategory = CATEGORIES.reduce((acc, category) => {
    acc[category] = certifications.filter((c) => c.certification.category === category);
    return acc;
  }, {} as Record<string, FranchiseeCertification[]>);

  // Summary stats
  const totalCerts = certifications.length;
  const activeCerts = certifications.filter((c) => c.status === "ACTIVE").length;
  const expiringSoon = certifications.filter((c) => c.status === "EXPIRING_SOON").length;
  const expired = certifications.filter((c) => c.status === "EXPIRED" || c.status === "REVOKED").length;

  // Required certs
  const requiredCerts = certifications.filter((c) => c.certification.requiredForLaunch);
  const requiredComplete = requiredCerts.filter((c) => c.status === "ACTIVE").length;
  const totalRequired = requiredCerts.length;

  const getCategoryLabel = (category: string) => {
    return category.charAt(0) + category.slice(1).toLowerCase();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <ShieldCheckIcon className="h-4 w-4" />
            Total Certifications
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCerts}</p>
          <p className="text-sm text-gray-500 mt-1">{activeCerts} active</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircleIcon className="h-4 w-4" />
            Launch Requirements
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {requiredComplete}/{totalRequired}
          </p>
          <p className="text-sm text-gray-500 mt-1">complete</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-amber-600 mb-1">
            <ClockIcon className="h-4 w-4" />
            Expiring Soon
          </div>
          <p className="text-2xl font-bold text-amber-600">{expiringSoon}</p>
          <p className="text-sm text-gray-500 mt-1">within 30 days</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Expired
          </div>
          <p className="text-2xl font-bold text-red-600">{expired}</p>
          <p className="text-sm text-gray-500 mt-1">need attention</p>
        </div>
      </div>

      {/* Certifications by Category */}
      {CATEGORIES.map((category) => {
        const certs = byCategory[category];
        if (!certs || certs.length === 0) return null;

        return (
          <div key={category} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {getCategoryLabel(category)}
            </h3>
            <div className="space-y-3">
              {certs.map((cert) => {
                const status = STATUS_CONFIG[cert.status] || STATUS_CONFIG.ACTIVE;
                const StatusIcon = status.icon;

                return (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          cert.status === "ACTIVE"
                            ? "bg-green-100"
                            : cert.status === "EXPIRING_SOON"
                            ? "bg-amber-100"
                            : "bg-red-100"
                        }`}
                      >
                        <StatusIcon
                          className={`h-5 w-5 ${
                            cert.status === "ACTIVE"
                              ? "text-green-600"
                              : cert.status === "EXPIRING_SOON"
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {cert.certification.name}
                          {cert.certification.requiredForLaunch && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-brand-navy/10 text-brand-navy rounded">
                              Required
                            </span>
                          )}
                        </p>
                        {cert.certification.description && (
                          <p className="text-sm text-gray-500">{cert.certification.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                      <div className="mt-1 text-xs text-gray-500">
                        {cert.expiresAt && (
                          <span>Expires: {formatDate(cert.expiresAt)}</span>
                        )}
                        {!cert.expiresAt && <span>Earned: {formatDate(cert.earnedAt)}</span>}
                      </div>
                      {cert.documentUrl && (
                        <a
                          href={cert.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-navy hover:underline"
                        >
                          View Document
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {totalCerts === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <ShieldCheckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No certifications recorded yet.</p>
        </div>
      )}
    </div>
  );
}
