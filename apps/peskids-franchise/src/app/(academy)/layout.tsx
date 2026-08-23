"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useEffect } from "react";

interface ProspectData {
  pipelineStage: string;
}

export default function AcademyRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [prospectData, setProspectData] = useState<ProspectData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch prospect data to check pipeline stage
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
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) {
      fetchProspectData();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [session?.user?.id, status]);

  // Show loading state while checking auth
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-navy/20 border-t-brand-navy" />
          <p className="text-slate-500 font-medium">Loading Academy...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login?callbackUrl=/academy");
  }

  // Redirect to portal if not SELECTED
  if (prospectData && prospectData.pipelineStage !== "SELECTED") {
    redirect("/portal");
  }

  // Render children (the academy pages with their own AcademyLayout)
  return <>{children}</>;
}
