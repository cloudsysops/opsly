"use client";

import { useSession } from "next-auth/react";
import { usePathname, redirect } from "next/navigation";
import { useState, useEffect } from "react";
import ProspectSidebar from "@/components/prospect/ProspectSidebar";
import ProspectHeader from "@/components/prospect/ProspectHeader";
import MobileBottomNav from "@/components/prospect/MobileBottomNav";
import MobileQuickActions from "@/components/prospect/MobileQuickActions";
import {
  PortalLayoutProvider,
  PortalTopNav,
  PortalSectionSidebar,
} from "@/components/prospect/layout";
import EarlCoachWidget from "@/components/prospect/EarlCoachWidget";
import FeedbackWidget from "@/components/shared/FeedbackWidget";

interface ProspectData {
  pipelineStage: string;
  preWorkProgress: number;
  healthScore?: number;
}

export default function ProspectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prospectData, setProspectData] = useState<ProspectData | null>(null);

  // Fetch prospect data for sidebar
  useEffect(() => {
    async function fetchProspectData() {
      try {
        const response = await fetch("/api/prospect/me");
        if (response.ok) {
          const data = await response.json();
          setProspectData(data);
        }
      } catch (error) {
        console.error("Error fetching prospect data:", error);
      }
    }

    if (session?.user?.id) {
      fetchProspectData();
    }
  }, [session?.user?.id]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/login?callbackUrl=/portal");
  }

  // Redirect admins to admin portal - they don't have prospect profiles
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  const isSelected = prospectData?.pipelineStage === "SELECTED";
  const preWorkProgress = prospectData?.preWorkProgress || 0;

  // Franchisee layout: top nav + contextual sidebar (mirrors admin pattern)
  if (isSelected) {
    return (
      <PortalLayoutProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          {/* Top navigation with section tabs */}
          <PortalTopNav
            user={session.user}
            healthScore={prospectData?.healthScore}
          />

          {/* Main content area with contextual sidebar */}
          <div className="flex-1 flex">
            {/* Section-specific sidebar (null for Home) */}
            <PortalSectionSidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />

            {/* Page content - minimal padding, pages handle their own spacing */}
            <main className="flex-1 py-6 pb-20 sm:pb-6 overflow-x-hidden">
              {children}
            </main>
          </div>

          {/* Mobile Quick Actions FAB */}
          <MobileQuickActions />

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav onMoreClick={() => setSidebarOpen(true)} />

          {/* Earl AI Coach — floating bottom-right on all pages */}
          <EarlCoachWidget />

          {/* Feedback Widget — persistent right edge */}
          <FeedbackWidget />
        </div>
      </PortalLayoutProvider>
    );
  }

  // Prospect layout: existing sidebar + header (unchanged)
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <ProspectSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={session.user}
        isSelected={false}
        preWorkProgress={preWorkProgress}
      />

      {/* Main content area - offset by sidebar on desktop */}
      <div className="lg:pl-64">
        {/* Header */}
        <ProspectHeader
          onMenuClick={() => setSidebarOpen(true)}
          user={session.user}
          preWorkProgress={preWorkProgress}
          isSelected={false}
        />

        {/* Main Content - minimal padding, pages handle their own spacing */}
        <main className="py-6 pb-20 sm:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Feedback Widget — persistent right edge */}
      <FeedbackWidget />
    </div>
  );
}
