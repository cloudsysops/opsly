"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import {
  AdminLayoutProvider,
  AdminTopNav,
  AdminSectionSidebar,
} from "@/components/admin/layout";
import FeedbackWidget from "@/components/shared/FeedbackWidget";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  // Prospects should not access admin area - redirect to portal
  if (session.user.role !== "ADMIN") {
    redirect("/portal");
  }

  return (
    <AdminLayoutProvider>
      <div className="min-h-screen bg-brand-light flex flex-col">
        {/* Top navigation */}
        <AdminTopNav
          user={session.user}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Main content area with section sidebar */}
        <div className="flex-1 flex min-w-0">
          {/* Section-specific sidebar */}
          <AdminSectionSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Page content */}
          <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 xl:px-12 2xl:px-16">
            {children}
          </main>
        </div>

        {/* Feedback Widget — persistent right edge */}
        <FeedbackWidget />
      </div>
    </AdminLayoutProvider>
  );
}
