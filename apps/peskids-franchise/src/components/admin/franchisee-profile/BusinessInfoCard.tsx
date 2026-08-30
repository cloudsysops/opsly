"use client";

import React, { useState } from "react";
import {
  BuildingOfficeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { formatDate } from "@/lib/utils";

interface BusinessAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface BusinessInfoCardProps {
  franchisee: {
    id: string;
    franchiseeAccount?: {
      id: string;
      ein?: string | null;
      llcName?: string | null;
      stateOfIncorporation?: string | null;
      businessAddress?: BusinessAddress | null;
      bankName?: string | null;
      bankAccountLast4?: string | null;
      bankRoutingLast4?: string | null;
      insurancePolicyNumber?: string | null;
      insuranceCarrier?: string | null;
      insuranceExpiry?: string | Date | null;
      insuranceCoverageType?: string | null;
      insuranceEffectiveDate?: string | Date | null;
      insuranceCOIUrl?: string | null;
      launchDate?: string | Date | null;
      tcInstanceUrl?: string | null;
      profileData?: Record<string, unknown> | null;
    } | null;
  };
  onUpdate?: (data: Record<string, unknown>) => Promise<void>;
}

export default function BusinessInfoCard({ franchisee, onUpdate }: BusinessInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const account = franchisee.franchiseeAccount;

  const [formData, setFormData] = useState({
    ein: account?.ein || "",
    llcName: account?.llcName || "",
    stateOfIncorporation: account?.stateOfIncorporation || "",
    businessAddress: account?.businessAddress || { street: "", city: "", state: "", zip: "" },
    bankName: account?.bankName || "",
    bankAccountLast4: account?.bankAccountLast4 || "",
    bankRoutingLast4: account?.bankRoutingLast4 || "",
    insurancePolicyNumber: account?.insurancePolicyNumber || "",
    insuranceCarrier: account?.insuranceCarrier || "",
    insuranceExpiry: account?.insuranceExpiry ? new Date(account.insuranceExpiry).toISOString().split("T")[0] : "",
    launchDate: account?.launchDate ? new Date(account.launchDate).toISOString().split("T")[0] : "",
    tcInstanceUrl: account?.tcInstanceUrl || "",
  });

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      ein: account?.ein || "",
      llcName: account?.llcName || "",
      stateOfIncorporation: account?.stateOfIncorporation || "",
      businessAddress: account?.businessAddress || { street: "", city: "", state: "", zip: "" },
      bankName: account?.bankName || "",
      bankAccountLast4: account?.bankAccountLast4 || "",
      bankRoutingLast4: account?.bankRoutingLast4 || "",
      insurancePolicyNumber: account?.insurancePolicyNumber || "",
      insuranceCarrier: account?.insuranceCarrier || "",
      insuranceExpiry: account?.insuranceExpiry ? new Date(account.insuranceExpiry).toISOString().split("T")[0] : "",
      launchDate: account?.launchDate ? new Date(account.launchDate).toISOString().split("T")[0] : "",
      tcInstanceUrl: account?.tcInstanceUrl || "",
    });
    setIsEditing(false);
  };

  const address = formData.businessAddress as BusinessAddress;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
          Business Information
        </h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LLC Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LLC Name</label>
            <input
              type="text"
              value={formData.llcName}
              onChange={(e) => setFormData({ ...formData, llcName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          {/* EIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">EIN</label>
            <input
              type="text"
              value={formData.ein}
              onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
              placeholder="XX-XXXXXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          {/* State of Incorporation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State of Incorporation</label>
            <input
              type="text"
              value={formData.stateOfIncorporation}
              onChange={(e) => setFormData({ ...formData, stateOfIncorporation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          {/* Launch Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Launch Date</label>
            <input
              type="date"
              value={formData.launchDate}
              onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          {/* Business Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
            <input
              type="text"
              value={address.street || ""}
              onChange={(e) => setFormData({ ...formData, businessAddress: { ...address, street: e.target.value } })}
              placeholder="Street Address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy mb-2"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={address.city || ""}
                onChange={(e) => setFormData({ ...formData, businessAddress: { ...address, city: e.target.value } })}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              />
              <input
                type="text"
                value={address.state || ""}
                onChange={(e) => setFormData({ ...formData, businessAddress: { ...address, state: e.target.value } })}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              />
              <input
                type="text"
                value={address.zip || ""}
                onChange={(e) => setFormData({ ...formData, businessAddress: { ...address, zip: e.target.value } })}
                placeholder="ZIP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Insurance Information</h4>
          </div>

          {/* Insurance Carrier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Carrier</label>
            <input
              type="text"
              value={formData.insuranceCarrier}
              onChange={(e) => setFormData({ ...formData, insuranceCarrier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          {/* Policy Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
            <input
              type="text"
              value={formData.insurancePolicyNumber}
              onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          {/* Insurance Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry</label>
            <input
              type="date"
              value={formData.insuranceExpiry}
              onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          {/* TC Instance URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TutorCruncher URL</label>
            <input
              type="url"
              value={formData.tcInstanceUrl}
              onChange={(e) => setFormData({ ...formData, tcInstanceUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="LLC Name" value={account?.llcName} />
          <InfoRow label="EIN" value={account?.ein} />
          <InfoRow label="State of Incorporation" value={account?.stateOfIncorporation} />
          <InfoRow
            label="Launch Date"
            value={account?.launchDate ? formatDate(account.launchDate) : null}
          />
          <InfoRow
            label="Business Address"
            value={
              account?.businessAddress
                ? formatAddress(account.businessAddress as BusinessAddress)
                : null
            }
            className="md:col-span-2"
          />

          <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Insurance Information</h4>
          </div>

          <InfoRow label="Insurance Carrier" value={account?.insuranceCarrier} />
          <InfoRow label="Policy Number" value={account?.insurancePolicyNumber} />
          <InfoRow label="Coverage Type" value={account?.insuranceCoverageType} />
          <InfoRow
            label="Effective Date"
            value={account?.insuranceEffectiveDate ? formatDate(account.insuranceEffectiveDate) : null}
          />
          <InfoRow
            label="Expiry Date"
            value={account?.insuranceExpiry ? formatDate(account.insuranceExpiry) : null}
          />
          <InfoRow
            label="Certificate of Insurance"
            value={account?.insuranceCOIUrl}
            isLink
            linkLabel="View COI"
          />
          <InfoRow
            label="TutorCruncher URL"
            value={account?.tcInstanceUrl}
            isLink
          />

          {/* Custom Profile Data (collected via Academy modules) */}
          {account?.profileData && Object.keys(account.profileData).length > 0 && (
            <>
              <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Collected Information</h4>
              </div>
              {Object.entries(account.profileData).map(([key, value]) => {
                const strVal = value != null ? String(value) : null;
                const isFileUrl = (strVal?.startsWith("/uploads/") || strVal?.startsWith("/api/files/")) || false;
                return (
                  <InfoRow
                    key={key}
                    label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    value={strVal}
                    isLink={isFileUrl}
                    linkLabel={isFileUrl ? "View uploaded file" : undefined}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  className = "",
  isLink = false,
  linkLabel,
}: {
  label: string;
  value?: string | null;
  className?: string;
  isLink?: boolean;
  linkLabel?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5">
        {value ? (
          isLink ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-navy hover:underline"
            >
              {linkLabel || value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-gray-400">Not set</span>
        )}
      </dd>
    </div>
  );
}

function formatAddress(address: BusinessAddress): string | null {
  const parts = [
    address.street,
    [address.city, address.state].filter(Boolean).join(", "),
    address.zip,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
