export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Decimal } from '@prisma/client/runtime/library';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ClockIcon,
  AcademicCapIcon,
  StarIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolid } from '@heroicons/react/24/solid';

interface FranchiseeStats {
  id: string;
  name: string;
  email: string;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  ytdRevenue: number;
  totalLessons: number;
  activeStudents: number;
  activeTutors: number;
  monthsActive: number;
  growth: number;
}

function formatCurrency(amount: number | Decimal): string {
  const num = typeof amount === 'number' ? amount : Number(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value: number): string {
  if (!isFinite(value)) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
    redirect('/');
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const previousMonth = currentMonth > 1 ? currentMonth - 1 : 12;
  const previousMonthYear = currentMonth > 1 ? currentYear : currentYear - 1;

  // Get all franchisee accounts with their TC snapshots
  const franchisees = await db.franchiseeAccount.findMany({
    include: {
      prospect: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          selectedAt: true,
        },
      },
      tcSnapshots: {
        where: {
          OR: [
            { year: currentYear },
            { year: previousMonthYear, month: previousMonth },
          ],
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      },
    },
  });

  // Calculate stats for each franchisee
  const stats: FranchiseeStats[] = franchisees.map((franchisee) => {
    const currentMonthSnapshot = franchisee.tcSnapshots.find(
      (s) => s.year === currentYear && s.month === currentMonth
    );
    const previousMonthSnapshot = franchisee.tcSnapshots.find(
      (s) => s.year === previousMonthYear && s.month === previousMonth
    );

    const currentMonthRevenue = currentMonthSnapshot
      ? Number(currentMonthSnapshot.grossRevenue)
      : 0;
    const previousMonthRevenue = previousMonthSnapshot
      ? Number(previousMonthSnapshot.grossRevenue)
      : 0;

    const ytdRevenue = franchisee.tcSnapshots
      .filter((s) => s.year === currentYear)
      .reduce((sum, s) => sum + Number(s.grossRevenue), 0);

    const totalLessons = franchisee.tcSnapshots
      .filter((s) => s.year === currentYear)
      .reduce((sum, s) => sum + (s.totalLessons || 0), 0);

    const latestSnapshot = franchisee.tcSnapshots[0];
    const activeStudents = latestSnapshot?.activeStudents || 0;
    const activeTutors = latestSnapshot?.activeTutors || 0;

    // Calculate months active (since selection)
    const selectedAt = franchisee.prospect.selectedAt;
    const monthsActive = selectedAt
      ? Math.max(
          1,
          (now.getFullYear() - selectedAt.getFullYear()) * 12 +
            now.getMonth() -
            selectedAt.getMonth()
        )
      : 1;

    // Calculate growth
    const growth =
      previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : currentMonthRevenue > 0
        ? 100
        : 0;

    return {
      id: franchisee.id,
      name: `${franchisee.prospect.firstName} ${franchisee.prospect.lastName}`,
      email: franchisee.prospect.email,
      currentMonthRevenue,
      previousMonthRevenue,
      ytdRevenue,
      totalLessons,
      activeStudents,
      activeTutors,
      monthsActive,
      growth,
    };
  });

  // Sort by YTD revenue for default ranking
  const sortedByRevenue = [...stats].sort((a, b) => b.ytdRevenue - a.ytdRevenue);
  const sortedByGrowth = [...stats].sort((a, b) => b.growth - a.growth);
  const sortedByLessons = [...stats].sort((a, b) => b.totalLessons - a.totalLessons);
  const sortedByStudents = [...stats].sort((a, b) => b.activeStudents - a.activeStudents);

  // Network totals
  const networkTotalRevenue = stats.reduce((sum, s) => sum + s.ytdRevenue, 0);
  const networkTotalLessons = stats.reduce((sum, s) => sum + s.totalLessons, 0);
  const networkTotalStudents = stats.reduce((sum, s) => sum + s.activeStudents, 0);
  const networkAverageRevenue = stats.length > 0 ? networkTotalRevenue / stats.length : 0;

  // Get top 3 for each category
  const topRevenueLeaders = sortedByRevenue.slice(0, 3);
  const topGrowthLeaders = sortedByGrowth.slice(0, 3);
  const topLessonLeaders = sortedByLessons.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrophyIcon className="h-7 w-7 text-amber-500" />
            Franchisee Leaderboard
          </h1>
          <p className="text-slate-600 mt-1">
            {currentYear} performance rankings across {stats.length} franchisee{stats.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ClockIcon className="h-4 w-4" />
          Updated: {now.toLocaleDateString()}
        </div>
      </div>

      {/* Network Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="text-blue-100 text-sm font-medium mb-1">Network Revenue</div>
          <div className="text-2xl font-bold">{formatCurrency(networkTotalRevenue)}</div>
          <div className="text-blue-100 text-sm mt-2">YTD total</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="text-green-100 text-sm font-medium mb-1">Lessons Delivered</div>
          <div className="text-2xl font-bold">{formatNumber(networkTotalLessons)}</div>
          <div className="text-green-100 text-sm mt-2">YTD total</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="text-purple-100 text-sm font-medium mb-1">Active Students</div>
          <div className="text-2xl font-bold">{formatNumber(networkTotalStudents)}</div>
          <div className="text-purple-100 text-sm mt-2">Across network</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="text-amber-100 text-sm font-medium mb-1">Average Revenue</div>
          <div className="text-2xl font-bold">{formatCurrency(networkAverageRevenue)}</div>
          <div className="text-amber-100 text-sm mt-2">Per franchisee YTD</div>
        </div>
      </div>

      {/* Top Performers Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Leaders */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrophySolid className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Revenue Leaders</h3>
          </div>
          <div className="space-y-3">
            {topRevenueLeaders.map((leader, index) => (
              <div key={leader.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                  index === 0 ? 'bg-amber-100 text-amber-700' :
                  index === 1 ? 'bg-slate-200 text-slate-600' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{leader.name}</div>
                  <div className="text-xs text-slate-500">{formatCurrency(leader.ytdRevenue)}</div>
                </div>
                {index === 0 && <StarIcon className="h-5 w-5 text-amber-500" />}
              </div>
            ))}
            {topRevenueLeaders.length === 0 && (
              <p className="text-sm text-slate-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Growth Leaders */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Growth Leaders</h3>
          </div>
          <div className="space-y-3">
            {topGrowthLeaders.map((leader, index) => (
              <div key={leader.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                  index === 0 ? 'bg-green-100 text-green-700' :
                  index === 1 ? 'bg-slate-200 text-slate-600' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{leader.name}</div>
                  <div className="text-xs text-slate-500">{formatPercent(leader.growth)} MoM</div>
                </div>
                {index === 0 && <FireIcon className="h-5 w-5 text-orange-500" />}
              </div>
            ))}
            {topGrowthLeaders.length === 0 && (
              <p className="text-sm text-slate-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Lesson Leaders */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <AcademicCapIcon className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Lesson Leaders</h3>
          </div>
          <div className="space-y-3">
            {topLessonLeaders.map((leader, index) => (
              <div key={leader.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                  index === 0 ? 'bg-purple-100 text-purple-700' :
                  index === 1 ? 'bg-slate-200 text-slate-600' :
                  'bg-violet-100 text-violet-700'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{leader.name}</div>
                  <div className="text-xs text-slate-500">{formatNumber(leader.totalLessons)} lessons</div>
                </div>
              </div>
            ))}
            {topLessonLeaders.length === 0 && (
              <p className="text-sm text-slate-500">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Full Rankings Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Complete Rankings</h3>
          <p className="text-sm text-slate-500 mt-1">Sorted by YTD revenue</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Franchisee
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  This Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  YTD Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Growth
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Lessons
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tutors
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedByRevenue.map((stat, index) => (
                <tr key={stat.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-slate-200 text-slate-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{stat.name}</div>
                    <div className="text-xs text-slate-500">{stat.monthsActive} months active</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {formatCurrency(stat.currentMonthRevenue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatCurrency(stat.ytdRevenue)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`text-sm font-medium ${
                      stat.growth > 0 ? 'text-green-600' :
                      stat.growth < 0 ? 'text-red-600' :
                      'text-slate-500'
                    }`}>
                      {formatPercent(stat.growth)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-700">
                    {formatNumber(stat.totalLessons)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-700">
                    {formatNumber(stat.activeStudents)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-700">
                    {formatNumber(stat.activeTutors)}
                  </td>
                </tr>
              ))}
              {sortedByRevenue.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No franchisee data available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benchmarks Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Network Benchmarks</h3>
        <p className="text-sm text-slate-600 mb-4">
          Compare performance metrics against network averages
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <BenchmarkCard
            label="Avg Monthly Revenue"
            value={formatCurrency(networkAverageRevenue / Math.max(currentMonth, 1))}
            description="Target: $15,000/month"
            color="blue"
          />
          <BenchmarkCard
            label="Avg Lessons/Month"
            value={formatNumber(Math.round(networkTotalLessons / Math.max(stats.length, 1) / Math.max(currentMonth, 1)))}
            description="Target: 50 lessons/month"
            color="green"
          />
          <BenchmarkCard
            label="Avg Students"
            value={formatNumber(Math.round(networkTotalStudents / Math.max(stats.length, 1)))}
            description="Target: 25+ students"
            color="purple"
          />
          <BenchmarkCard
            label="Avg Tutors"
            value={formatNumber(Math.round(stats.reduce((sum, s) => sum + s.activeTutors, 0) / Math.max(stats.length, 1)))}
            description="Target: 3+ tutors"
            color="amber"
          />
        </div>
      </div>
    </div>
  );
}

function BenchmarkCard({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-2">{description}</div>
    </div>
  );
}
