"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckBadgeIcon,
  CreditCardIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { formatDate } from "@/lib/utils";

interface FranchiseeProfileHeaderProps {
  franchisee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    preferredTerritory?: string | null;
    selectedAt?: string | Date | null;
    franchiseeAccount?: {
      stripeOnboarded: boolean;
      tutorCruncherBase?: string | null;
      tcInstanceUrl?: string | null;
      llcName?: string | null;
    } | null;
  };
  onSendEmail?: () => void;
  onLogCall?: () => void;
  onEdit?: () => void;
}

export default function FranchiseeProfileHeader({
  franchisee,
  onSendEmail,
  onLogCall,
  onEdit,
}: FranchiseeProfileHeaderProps) {
  const account = franchisee.franchiseeAccount;
  const tcConnected = !!(account?.tutorCruncherBase || account?.tcInstanceUrl);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Back link */}
      <Link
        href="/admin/franchisees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to All Franchisees
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Left side - Name and info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-16 w-16 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold text-xl flex-shrink-0">
            {franchisee.firstName[0]}
            {franchisee.lastName[0]}
          </div>

          <div>
            {/* Name and LLC */}
            <h1 className="text-2xl font-bold text-gray-900">
              {franchisee.firstName} {franchisee.lastName}
            </h1>
            {account?.llcName && (
              <p className="text-gray-500 text-sm mt-0.5">{account.llcName}</p>
            )}

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* TC Connected */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  tcConnected
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <ChartBarIcon className="h-3.5 w-3.5" />
                {tcConnected ? "TC Connected" : "TC Not Connected"}
              </span>

              {/* Stripe */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  account?.stripeOnboarded
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                <CreditCardIcon className="h-3.5 w-3.5" />
                {account?.stripeOnboarded ? "Stripe Active" : "Stripe Pending"}
              </span>

              {/* Selected Date */}
              {franchisee.selectedAt && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-navy/10 text-brand-navy">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  Selected {formatDate(franchisee.selectedAt)}
                </span>
              )}
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
              <a
                href={`mailto:${franchisee.email}`}
                className="flex items-center gap-1.5 hover:text-brand-navy"
              >
                <EnvelopeIcon className="h-4 w-4" />
                {franchisee.email}
              </a>
              {franchisee.phone && (
                <a
                  href={`tel:${franchisee.phone}`}
                  className="flex items-center gap-1.5 hover:text-brand-navy"
                >
                  <PhoneIcon className="h-4 w-4" />
                  {franchisee.phone}
                </a>
              )}
              {franchisee.preferredTerritory && (
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="h-4 w-4" />
                  {franchisee.preferredTerritory}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Quick actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onSendEmail && (
            <button
              onClick={onSendEmail}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <EnvelopeIcon className="h-4 w-4" />
              Send Email
            </button>
          )}
          {onLogCall && (
            <button
              onClick={onLogCall}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PhoneIcon className="h-4 w-4" />
              Log Call
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 transition-colors"
            >
              Edit Info
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
