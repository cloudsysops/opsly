"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import AcademyLayout from "@/components/academy/AcademyLayout";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import CoachChat from "@/components/academy/coach/CoachChat";

interface ProgressData {
  total_points: number;
  current_streak_days: number;
  badges_earned: number;
  completion_percentage: number;
}

export default function CoachPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await fetch("/api/bootcamp/progress");
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    points: progress?.total_points || 0,
    badges: progress?.badges_earned || 0,
    streak: progress?.current_streak_days || 0,
  };

  if (loading) {
    return (
      <AcademyLayout progress={0} stats={stats} user={session?.user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-navy/20 border-t-brand-navy" />
            <p className="text-slate-500 font-medium">Loading AI Coach...</p>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout
      progress={progress?.completion_percentage || 0}
      stats={stats}
      user={session?.user}
    >
      <WideContainer className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#6A469D] to-brand-navy p-0.5">
              <Image
                src="/images/characters/mascot.svg"
                alt="Acme Franchise Mascot"
                width={48}
                height={48}
                className="rounded-full"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                AI Coach
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  Beta
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Get instant answers about franchise operations, marketing, and more
              </p>
            </div>
          </div>
        </div>

        {/* Chat Component */}
        <CoachChat prospectId={session?.user?.id || ""} />
      </WideContainer>
    </AcademyLayout>
  );
}
