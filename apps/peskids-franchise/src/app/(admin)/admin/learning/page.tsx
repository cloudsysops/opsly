import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import Link from "next/link";
import {
  AcademicCapIcon,
  ChartBarIcon,
  CheckCircleIcon,
  UserGroupIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

async function getAcademyStats() {
  // Get date ranges
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get all SELECTED prospects (franchisees)
  const franchisees = await db.prospect.findMany({
    where: { pipelineStage: "SELECTED" },
    include: {
      academyProgress: {
        select: {
          moduleId: true,
          status: true,
          completedAt: true,
        },
      },
      dailyActivity: {
        where: {
          date: { gte: sevenDaysAgo },
        },
        select: { date: true },
      },
    },
  });

  // Get total modules count
  const totalModules = await db.academyModule.count();

  // Calculate stats
  const activeFranchisees = franchisees.length;

  // Calculate average completion percentage
  let totalCompletionPercentage = 0;
  franchisees.forEach((f) => {
    const completed = f.academyProgress.filter((p) => p.status === "COMPLETED").length;
    const percentage = totalModules > 0 ? (completed / totalModules) * 100 : 0;
    totalCompletionPercentage += percentage;
  });
  const avgCompletionPercentage = activeFranchisees > 0
    ? Math.round(totalCompletionPercentage / activeFranchisees)
    : 0;

  // Modules completed this week
  const modulesCompletedThisWeek = franchisees.reduce((count, f) => {
    return count + f.academyProgress.filter((p) =>
      p.status === "COMPLETED" &&
      p.completedAt &&
      new Date(p.completedAt) >= sevenDaysAgo
    ).length;
  }, 0);

  // Active learners (activity in last 7 days)
  const activeLearners = franchisees.filter((f) =>
    f.dailyActivity.length > 0
  ).length;

  // Get recent module completions
  const recentCompletions = await db.academyProgress.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { gte: sevenDaysAgo },
      prospect: { pipelineStage: "SELECTED" },
    },
    include: {
      prospect: {
        select: { firstName: true, lastName: true, id: true },
      },
      module: {
        select: { title: true },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 10,
  });

  // Get recent badge earnings
  const recentBadges = await db.earnedBadge.findMany({
    where: {
      earnedAt: { gte: sevenDaysAgo },
      prospect: { pipelineStage: "SELECTED" },
    },
    include: {
      prospect: {
        select: { firstName: true, lastName: true, id: true },
      },
      badge: {
        select: { title: true },
      },
    },
    orderBy: { earnedAt: "desc" },
    take: 10,
  });

  // Combine recent activity
  const recentActivity = [
    ...recentCompletions.map((c) => ({
      id: c.id,
      type: "module_completed" as const,
      prospectId: c.prospect.id,
      prospectName: `${c.prospect.firstName} ${c.prospect.lastName}`,
      detail: c.module.title,
      timestamp: c.completedAt,
    })),
    ...recentBadges.map((b) => ({
      id: b.id,
      type: "badge_earned" as const,
      prospectId: b.prospect.id,
      prospectName: `${b.prospect.firstName} ${b.prospect.lastName}`,
      detail: b.badge.title,
      timestamp: b.earnedAt,
    })),
  ].sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  }).slice(0, 8);

  // Find franchisees needing attention (no activity in 7+ days, not completed)
  const needsAttention = franchisees
    .filter((f) => {
      const completedCount = f.academyProgress.filter((p) => p.status === "COMPLETED").length;
      const hasRecentActivity = f.dailyActivity.length > 0;
      return completedCount < totalModules && !hasRecentActivity;
    })
    .map((f) => ({
      id: f.id,
      name: `${f.firstName} ${f.lastName}`,
      email: f.email,
      completedModules: f.academyProgress.filter((p) => p.status === "COMPLETED").length,
      totalModules,
      percentage: totalModules > 0
        ? Math.round((f.academyProgress.filter((p) => p.status === "COMPLETED").length / totalModules) * 100)
        : 0,
    }))
    .slice(0, 5);

  return {
    stats: {
      activeFranchisees,
      avgCompletionPercentage,
      modulesCompletedThisWeek,
      activeLearners,
      totalModules,
    },
    recentActivity,
    needsAttention,
  };
}

export default async function AcademyDashboard() {
  const { stats, recentActivity, needsAttention } = await getAcademyStats();

  return (
    <div className="space-y-4 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Learning Center</h1>
        <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
          Monitor franchisee training progress and engagement
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-navy/10 rounded-lg">
                <UserGroupIcon className="h-5 w-5 text-brand-navy" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-medium text-gray-500">
                  Active Franchisees
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-bold text-brand-navy">
                  {stats.activeFranchisees}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-green/10 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-brand-green" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-medium text-gray-500">
                  Avg. Completion
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-bold text-brand-green">
                  {stats.avgCompletionPercentage}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-cyan/10 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-brand-cyan" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-medium text-gray-500">
                  Modules This Week
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-bold text-brand-cyan">
                  {stats.modulesCompletedThisWeek}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-purple/10 rounded-lg">
                <AcademicCapIcon className="h-5 w-5 text-brand-purple" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-medium text-gray-500">
                  Active Learners
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-bold text-brand-purple">
                  {stats.activeLearners}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h2 className="text-base sm:text-lg font-semibold text-brand-navy">
              Recent Activity
            </h2>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {recentActivity.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex gap-2.5 sm:gap-3 text-xs sm:text-sm">
                    <div className="flex-shrink-0 mt-0.5">
                      {activity.type === "module_completed" ? (
                        <CheckCircleIcon className="h-5 w-5 text-brand-green" />
                      ) : (
                        <TrophyIcon className="h-5 w-5 text-brand-yellow" />
                      )}
                    </div>
                    <div>
                      <p className="text-gray-900">
                        <Link
                          href={`/admin/learning/franchisees?id=${activity.prospectId}`}
                          className="font-medium hover:text-brand-purple"
                        >
                          {activity.prospectName}
                        </Link>{" "}
                        <span className="text-gray-600">
                          {activity.type === "module_completed"
                            ? "completed"
                            : "earned"}
                        </span>{" "}
                        <span className="font-medium">{activity.detail}</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {activity.timestamp
                          ? new Date(activity.timestamp).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )
                          : "Recently"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500">No recent activity</p>
            )}
            {recentActivity.length > 0 && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                <Link
                  href="/admin/learning/franchisees"
                  className="text-xs sm:text-sm font-medium text-brand-purple hover:underline"
                >
                  View All Franchisees
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-brand-orange" />
              <h2 className="text-base sm:text-lg font-semibold text-brand-navy">
                Needs Attention
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            {needsAttention.length > 0 ? (
              <div className="space-y-3">
                {needsAttention.map((franchisee) => (
                  <div
                    key={franchisee.id}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                  >
                    <div>
                      <Link
                        href={`/admin/learning/franchisees?id=${franchisee.id}`}
                        className="font-medium text-gray-900 hover:text-brand-purple text-sm"
                      >
                        {franchisee.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        No activity in 7+ days
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {franchisee.percentage}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {franchisee.completedModules}/{franchisee.totalModules} modules
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-brand-green mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  All franchisees are on track!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-base sm:text-lg font-semibold text-brand-navy">
            Quick Actions
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Link
              href="/admin/learning/franchisees"
              className="px-4 py-2.5 sm:py-2 bg-brand-navy text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-brand-purple transition-colors text-center"
            >
              View All Progress
            </Link>
            <Link
              href="/admin/learning/program-builder"
              className="px-4 py-2.5 sm:py-2 bg-brand-cyan text-brand-navy rounded-lg text-xs sm:text-sm font-medium hover:bg-brand-cyan/80 transition-colors text-center"
            >
              Program Builder
            </Link>
            <Link
              href="/admin/learning/library"
              className="px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors text-center"
            >
              Resource Library
            </Link>
            <Link
              href="/admin/learning/badges"
              className="px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200 transition-colors text-center"
            >
              Manage Badges
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
