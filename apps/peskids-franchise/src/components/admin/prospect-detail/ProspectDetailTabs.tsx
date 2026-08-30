"use client";

import { useState } from "react";
import { OverviewTab } from "./tabs/OverviewTab";
import { ActivitiesTab } from "./tabs/ActivitiesTab";
import { IntelligenceTab } from "./tabs/IntelligenceTab";
import { PreWorkTab } from "./tabs/PreWorkTab";
import { QuickActionBar } from "./quick-actions/QuickActionBar";

interface ProspectDetailTabsProps {
  prospect: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    preferredTerritory: string | null;
    interestLevel: string;
    liquidity: string | null;
    aboutYourself: string | null;
    referralSource: string | null;
    pipelineStage: string;
    prospectScore: number;
    preWorkStatus: string;
    assignedTo: string | null;
    createdAt: Date;
    lastContactAt: Date | null;
    utmSource: string | null;
    utmCampaign: string | null;
    passwordHash: string | null;
    inviteSentAt: Date | null;
    preWorkSubmissions: Array<{
      id: string;
      status: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content: any;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      reviewedBy: string | null;
      reviewNotes: string | null;
      score: number | null;
      module: {
        id: string;
        slug: string;
        title: string;
        sequence: number;
      };
    }>;
    documents: Array<{
      id: string;
      documentType: string;
      signatureStatus: string;
      acknowledgedAt: Date | null;
      sentAt: Date | null;
      signedAt: Date | null;
      viewedAt: Date | null;
      expiresAt: Date | null;
    }>;
    conversations: Array<{
      id: string;
      updatedAt: Date;
      messages: Array<{
        id: string;
        role: string;
        content: string;
      }>;
    }>;
    visitors: Array<{
      sessions: Array<{
        startedAt: Date;
        pageViews: Array<{
          pagePath: string;
          enteredAt: Date;
        }>;
      }>;
    }>;
    notes: Array<{
      id: string;
      content: string;
      authorEmail: string;
      isPinned: boolean;
      createdAt: Date;
    }>;
    activities: Array<{
      id: string;
      activityType: string;
      description: string;
      createdAt: Date;
    }>;
  };
}

type TabType = "overview" | "prework" | "activities" | "intelligence";

const tabs: { id: TabType; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "prework", label: "Pre-Work" },
  { id: "activities", label: "Activities" },
  { id: "intelligence", label: "Intelligence" },
];

export function ProspectDetailTabs({ prospect }: ProspectDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  return (
    <div className="space-y-4">
      {/* Quick Action Bar */}
      <QuickActionBar
        prospectId={prospect.id}
        prospectEmail={prospect.email}
        prospectName={`${prospect.firstName} ${prospect.lastName}`}
        prospectPhone={prospect.phone}
        hasPortalAccess={!!prospect.passwordHash}
        inviteSentAt={prospect.inviteSentAt}
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="-mb-px flex space-x-8" role="tablist" aria-label="Prospect details">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? "border-brand-purple text-brand-purple"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "overview" && <OverviewTab prospect={prospect} />}
        {activeTab === "prework" && (
          <PreWorkTab
            prospectId={prospect.id}
            submissions={prospect.preWorkSubmissions}
          />
        )}
        {activeTab === "activities" && <ActivitiesTab prospectId={prospect.id} />}
        {activeTab === "intelligence" && (
          <IntelligenceTab
            prospectId={prospect.id}
            prospectName={`${prospect.firstName} ${prospect.lastName}`}
          />
        )}
      </div>
    </div>
  );
}
