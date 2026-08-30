"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import FranchiseeProfileHeader from "@/components/admin/franchisee-profile/FranchiseeProfileHeader";
import FranchiseeProfileTabs from "@/components/admin/franchisee-profile/FranchiseeProfileTabs";
import EditInfoModal from "@/components/admin/franchisee-profile/EditInfoModal";
import OverviewTab from "@/components/admin/franchisee-profile/tabs/OverviewTab";
import FinancialsTab from "@/components/admin/franchisee-profile/tabs/FinancialsTab";
import AcademyTab from "@/components/admin/franchisee-profile/tabs/AcademyTab";
import ComplianceTab from "@/components/admin/franchisee-profile/tabs/ComplianceTab";
import ActivityTab from "@/components/admin/franchisee-profile/tabs/ActivityTab";

interface Franchisee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  preferredTerritory?: string | null;
  selectedAt?: string | null;
  pipelineStage: string;
  franchiseeAccount?: {
    id: string;
    ein?: string | null;
    llcName?: string | null;
    stateOfIncorporation?: string | null;
    businessAddress?: Record<string, unknown> | null;
    bankName?: string | null;
    bankAccountLast4?: string | null;
    bankRoutingLast4?: string | null;
    insurancePolicyNumber?: string | null;
    insuranceCarrier?: string | null;
    insuranceExpiry?: string | null;
    launchDate?: string | null;
    tcInstanceUrl?: string | null;
    tutorCruncherBase?: string | null;
    stripeAccountId?: string | null;
    stripeOnboarded: boolean;
    stripeOnboardedAt?: string | null;
    currentMonthRevenue?: string | number | null;
    ytdRevenue?: string | number | null;
    lastSyncAt?: string | null;
    contacts: Array<{
      id: string;
      contactType: "PRIMARY_OWNER" | "SPOUSE_PARTNER" | "OPERATIONS" | "ACCOUNTING" | "EMERGENCY";
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
      isPrimary: boolean;
    }>;
    invoices?: Array<{
      id: string;
      invoiceNumber: string;
      year: number;
      month: number;
      grossRevenue: string | number;
      totalAmount: string | number;
      status: string;
      invoiceDate: string;
      dueDate: string;
      paidAt?: string | null;
    }>;
    tcSnapshots?: Array<{
      id: string;
      year: number;
      month: number;
      grossRevenue: string | number;
      homeRevenue?: string | number | null;
      onlineRevenue?: string | number | null;
      retailRevenue?: string | number | null;
      schoolRevenue?: string | number | null;
      otherRevenue?: string | number | null;
      totalLessons?: number | null;
      activeStudents?: number | null;
    }>;
    certifications?: Array<{
      id: string;
      earnedAt: string;
      expiresAt?: string | null;
      status: string;
      documentUrl?: string | null;
      documentName?: string | null;
      certification: {
        id: string;
        slug: string;
        name: string;
        description?: string | null;
        requiredForLaunch: boolean;
        category: string;
      };
    }>;
  } | null;
  academyProgress?: Array<{
    id: string;
    status: string;
    completedAt?: string | null;
    module: {
      id: string;
      title: string;
      slug: string;
      isMilestone: boolean;
      phase: {
        title: string;
        slug: string;
        program: {
          name: string;
          slug: string;
        };
      };
    };
  }>;
  activities?: Array<{
    id: string;
    activityType: string;
    description: string;
    metadata?: Record<string, unknown> | null;
    performedBy?: string | null;
    createdAt: string;
  }>;
  earnedBadges?: Array<{
    id: string;
    earnedAt: string;
    badge: {
      id: string;
      slug: string;
      title: string;
      description: string;
      points: number;
    };
  }>;
}

export default function FranchiseeProfilePage() {
  const params = useParams();
  const franchiseeId = params.id as string;

  const [franchisee, setFranchisee] = useState<Franchisee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [showEditInfo, setShowEditInfo] = useState(false);

  useEffect(() => {
    fetchFranchisee();
  }, [franchiseeId]);

  const fetchFranchisee = async () => {
    try {
      const response = await fetch(`/api/admin/franchisees/${franchiseeId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch franchisee");
      }
      const data = await response.json();
      setFranchisee(data.franchisee);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInfo = async (data: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/franchisees/${franchiseeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Failed to update info");
    }
    await fetchFranchisee();
  };

  const handleUpdateBusiness = async (data: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/franchisees/${franchiseeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update business info");
    }
    await fetchFranchisee();
  };

  const handleAddContact = async (contact: {
    contactType: "PRIMARY_OWNER" | "SPOUSE_PARTNER" | "OPERATIONS" | "ACCOUNTING" | "EMERGENCY";
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    isPrimary: boolean;
  }) => {
    const response = await fetch(`/api/admin/franchisees/${franchiseeId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    if (!response.ok) {
      throw new Error("Failed to add contact");
    }
    await fetchFranchisee();
  };

  const handleUpdateContact = async (contactId: string, contact: Record<string, unknown>) => {
    const response = await fetch(
      `/api/admin/franchisees/${franchiseeId}/contacts/${contactId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to update contact");
    }
    await fetchFranchisee();
  };

  const handleDeleteContact = async (contactId: string) => {
    const response = await fetch(
      `/api/admin/franchisees/${franchiseeId}/contacts/${contactId}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to delete contact");
    }
    await fetchFranchisee();
  };

  const handleSetupStripe = async (): Promise<string | null> => {
    const response = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId: franchiseeId }),
    });
    const data = await response.json();
    return data.url || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (error || !franchisee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-600 mb-4">{error || "Franchisee not found"}</p>
        <a href="/admin/franchisees" className="text-brand-navy hover:underline">
          Back to All Franchisees
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <FranchiseeProfileHeader
        franchisee={franchisee}
        onSendEmail={() => {
          // TODO: Open send email modal
          window.location.href = `mailto:${franchisee.email}`;
        }}
        onLogCall={() => {
          // TODO: Open log call modal
          setAlertMsg("Log call feature coming soon");
        }}
        onEdit={() => {
          setShowEditInfo(true);
        }}
      />

      {/* Tabs */}
      <FranchiseeProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <OverviewTab
            franchisee={franchisee}
            onUpdateBusiness={handleUpdateBusiness}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
          />
        )}
        {activeTab === "financials" && <FinancialsTab franchisee={franchisee} />}
        {activeTab === "academy" && <AcademyTab franchisee={franchisee} />}
        {activeTab === "compliance" && <ComplianceTab franchisee={franchisee} />}
        {activeTab === "activity" && <ActivityTab franchisee={franchisee} />}
      </div>

      {franchisee && showEditInfo && (
        <EditInfoModal
          isOpen={showEditInfo}
          franchisee={franchisee}
          onClose={() => setShowEditInfo(false)}
          onSave={handleUpdateInfo}
        />
      )}

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
    </div>
  );
}
