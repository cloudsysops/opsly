"use client";

import React from "react";
import BusinessInfoCard from "../BusinessInfoCard";
import ContactsCard from "../ContactsCard";
import StripeConnectCard from "../StripeConnectCard";

interface OverviewTabProps {
  franchisee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
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
      insuranceExpiry?: string | Date | null;
      launchDate?: string | Date | null;
      tcInstanceUrl?: string | null;
      stripeAccountId?: string | null;
      stripeOnboarded: boolean;
      stripeOnboardedAt?: string | Date | null;
      contacts: Array<{
        id: string;
        contactType: "PRIMARY_OWNER" | "SPOUSE_PARTNER" | "OPERATIONS" | "ACCOUNTING" | "EMERGENCY";
        firstName: string;
        lastName: string;
        email?: string | null;
        phone?: string | null;
        isPrimary: boolean;
      }>;
    } | null;
  };
  onUpdateBusiness: (data: Record<string, unknown>) => Promise<void>;
  onAddContact: (contact: {
    contactType: "PRIMARY_OWNER" | "SPOUSE_PARTNER" | "OPERATIONS" | "ACCOUNTING" | "EMERGENCY";
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    isPrimary: boolean;
  }) => Promise<void>;
  onUpdateContact: (contactId: string, contact: Record<string, unknown>) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
}

export default function OverviewTab({
  franchisee,
  onUpdateBusiness,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
}: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Business Info */}
      <div className="lg:col-span-2">
        <BusinessInfoCard franchisee={franchisee} onUpdate={onUpdateBusiness} />
      </div>

      {/* Contacts */}
      <ContactsCard
        franchiseeId={franchisee.id}
        contacts={franchisee.franchiseeAccount?.contacts || []}
        onAddContact={onAddContact}
        onUpdateContact={onUpdateContact}
        onDeleteContact={onDeleteContact}
      />

      {/* Stripe Connect */}
      <StripeConnectCard franchisee={franchisee} />
    </div>
  );
}
