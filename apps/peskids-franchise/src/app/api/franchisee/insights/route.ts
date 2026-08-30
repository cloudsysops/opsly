import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Insight {
  id: string;
  type: string;
  title: string;
  message: string;
  action?: string;
  actionLink?: string;
  priority: 'critical' | 'warning' | 'info' | 'success';
  icon: string;
}

// GET /api/franchisee/insights - Generate personalized algorithmic insights
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: {
          include: {
            tcSnapshots: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 12,
            },
            invoices: {
              where: {
                status: {
                  notIn: ['DRAFT', 'CANCELLED', 'PAID'],
                },
              },
            },
            certifications: {
              include: {
                certification: { select: { name: true } },
              },
            },
          },
        },
        academyProgress: {
          where: { status: 'COMPLETED' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED' || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    const account = prospect.franchiseeAccount;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const insights: Insight[] = [];

    // ─── 1. Revenue Trend: 3+ months of declining revenue ──────────────────────

    const recentSnapshots = account.tcSnapshots.slice(0, 4); // Last 4 months
    if (recentSnapshots.length >= 3) {
      // Snapshots are sorted desc, so [0] is most recent
      let declineMonths = 0;
      for (let i = 0; i < recentSnapshots.length - 1; i++) {
        const current = Number(recentSnapshots[i].grossRevenue);
        const previous = Number(recentSnapshots[i + 1].grossRevenue);
        if (current < previous) {
          declineMonths++;
        } else {
          break;
        }
      }

      if (declineMonths >= 3) {
        const mostRecent = Number(recentSnapshots[0].grossRevenue);
        const threeMonthsAgo = Number(recentSnapshots[3].grossRevenue);
        const declinePercent = threeMonthsAgo > 0
          ? Math.round(((threeMonthsAgo - mostRecent) / threeMonthsAgo) * 100)
          : 0;

        insights.push({
          id: 'revenue-decline',
          type: 'revenue_trend',
          title: 'Revenue Trending Down',
          message: `Revenue has declined ${declinePercent}% over the last 3 months. Consider expanding your school outreach or launching online lesson promotions.`,
          action: 'View Revenue Details',
          actionLink: '/portal/royalties',
          priority: 'warning',
          icon: 'trending-down',
        });
      }
    }

    // ─── 2. Growth Opportunity: Revenue category < 10% of total ────────────────

    if (recentSnapshots.length > 0) {
      const latestSnapshot = recentSnapshots[0];
      const totalRevenue = Number(latestSnapshot.grossRevenue);

      if (totalRevenue > 0) {
        const categories = [
          { name: 'Online lessons', value: Number(latestSnapshot.onlineRevenue || 0) },
          { name: 'Home lessons', value: Number(latestSnapshot.homeRevenue || 0) },
          { name: 'Retail/Club', value: Number(latestSnapshot.retailRevenue || 0) },
          { name: 'School programs', value: Number(latestSnapshot.schoolRevenue || 0) },
        ];

        // Get network averages for comparison
        const allSnapshots = await db.tutorCruncherSnapshot.findMany({
          where: {
            year: latestSnapshot.year,
            month: latestSnapshot.month,
          },
          select: {
            grossRevenue: true,
            onlineRevenue: true,
            homeRevenue: true,
            retailRevenue: true,
            schoolRevenue: true,
          },
        });

        const networkTotal = allSnapshots.reduce((s, r) => s + Number(r.grossRevenue), 0);
        const networkOnline = allSnapshots.reduce((s, r) => s + Number(r.onlineRevenue || 0), 0);
        const networkHome = allSnapshots.reduce((s, r) => s + Number(r.homeRevenue || 0), 0);
        const networkRetail = allSnapshots.reduce((s, r) => s + Number(r.retailRevenue || 0), 0);
        const networkSchool = allSnapshots.reduce((s, r) => s + Number(r.schoolRevenue || 0), 0);

        const networkAvgs = [
          { name: 'Online lessons', pct: networkTotal > 0 ? Math.round((networkOnline / networkTotal) * 100) : 0 },
          { name: 'Home lessons', pct: networkTotal > 0 ? Math.round((networkHome / networkTotal) * 100) : 0 },
          { name: 'Retail/Club', pct: networkTotal > 0 ? Math.round((networkRetail / networkTotal) * 100) : 0 },
          { name: 'School programs', pct: networkTotal > 0 ? Math.round((networkSchool / networkTotal) * 100) : 0 },
        ];

        for (let i = 0; i < categories.length; i++) {
          const cat = categories[i];
          const pct = Math.round((cat.value / totalRevenue) * 100);
          const networkPct = networkAvgs[i].pct;

          if (pct < 10 && networkPct > 15) {
            insights.push({
              id: `growth-${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
              type: 'growth_opportunity',
              title: `${cat.name} Opportunity`,
              message: `${cat.name} represent only ${pct}% of your revenue. The network average is ${networkPct}%. This could be an untapped growth area.`,
              action: 'View Revenue Breakdown',
              actionLink: '/portal/royalties',
              priority: 'info',
              icon: 'lightbulb',
            });
            break; // Only show one growth opportunity
          }
        }
      }
    }

    // ─── 3. Compliance Alert: Certifications expiring within 60 days ───────────

    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const expiringCerts = account.certifications.filter(
      (c) => c.expiresAt && c.expiresAt <= sixtyDaysFromNow && c.expiresAt > now
    );

    if (expiringCerts.length > 0) {
      const certNames = expiringCerts
        .map((c) => c.certification.name)
        .slice(0, 3)
        .join(', ');

      insights.push({
        id: 'compliance-expiring',
        type: 'compliance_alert',
        title: 'Certifications Expiring Soon',
        message: `${expiringCerts.length} certification${expiringCerts.length !== 1 ? 's' : ''} will expire within 60 days: ${certNames}. Stay ahead of compliance requirements.`,
        action: 'View Compliance',
        actionLink: '/portal/compliance',
        priority: expiringCerts.some((c) => {
          const days = Math.ceil((c.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return days <= 14;
        }) ? 'critical' : 'warning',
        icon: 'shield',
      });
    }

    // ─── 4. Performance Celebration: Percentile >= 75 ──────────────────────────

    if (recentSnapshots.length > 0) {
      const latestSnapshot = recentSnapshots[0];
      const myRevenue = Number(latestSnapshot.grossRevenue);

      const allCurrentSnapshots = await db.tutorCruncherSnapshot.findMany({
        where: {
          year: latestSnapshot.year,
          month: latestSnapshot.month,
        },
        select: { grossRevenue: true, franchiseeAccountId: true },
      });

      if (allCurrentSnapshots.length > 1) {
        const sorted = allCurrentSnapshots
          .map((s) => Number(s.grossRevenue))
          .sort((a, b) => a - b);

        const myIndex = sorted.filter((r) => r <= myRevenue).length;
        const percentile = Math.round((myIndex / sorted.length) * 100);

        if (percentile >= 75) {
          insights.push({
            id: 'performance-celebration',
            type: 'performance',
            title: 'Top Performer!',
            message: `You're in the top ${100 - percentile}% of all franchisees this month. Keep up the great work!`,
            priority: 'success',
            icon: 'trophy',
          });
        }

        // ─── 8. Benchmark Insight: Below network median ────────────────────────

        if (percentile < 50 && sorted.length > 2) {
          const medianIndex = Math.floor(sorted.length / 2);
          const median = sorted[medianIndex];
          const gap = Math.round(median - myRevenue);

          if (gap > 0) {
            insights.push({
              id: 'benchmark-below-median',
              type: 'benchmark',
              title: 'Room to Grow',
              message: `Your revenue is $${gap.toLocaleString()} below the network median. The top performers focus on diversifying lesson types and expanding school partnerships.`,
              action: 'View Benchmarks',
              actionLink: '/portal/my-franchise',
              priority: 'info',
              icon: 'chart-bar',
            });
          }
        }
      }
    }

    // ─── 5. Royalty Reminder: Outstanding invoices ──────────────────────────────

    const outstandingInvoices = account.invoices;
    if (outstandingInvoices.length > 0) {
      const totalOutstanding = outstandingInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalAmount),
        0
      );

      insights.push({
        id: 'royalty-reminder',
        type: 'royalty',
        title: 'Invoices Need Attention',
        message: `You have ${outstandingInvoices.length} invoice${outstandingInvoices.length !== 1 ? 's' : ''} pending review totaling $${totalOutstanding.toLocaleString()}. Review and approve to stay current.`,
        action: 'Review Invoices',
        actionLink: '/portal/royalties',
        priority: outstandingInvoices.length >= 3 ? 'critical' : 'warning',
        icon: 'document',
      });
    }

    // ─── 6. Journey Progress: < 50% and selected > 30 days ago ─────────────────

    const selectedAt = prospect.selectedAt;
    if (selectedAt) {
      const daysSinceSelection = Math.floor(
        (now.getTime() - selectedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const totalAcademyModules = await db.academyModule.count();
      const completedTasks = prospect.academyProgress.length;
      const completionPercent = totalAcademyModules > 0
        ? Math.round((completedTasks / totalAcademyModules) * 100)
        : 0;

      if (completionPercent < 50 && daysSinceSelection > 30) {
        insights.push({
          id: 'journey-progress',
          type: 'journey',
          title: 'Keep Your Journey On Track',
          message: `You're ${completionPercent}% through your 90-day journey (Day ${daysSinceSelection}). Complete pending tasks to stay on schedule and ensure a successful launch.`,
          action: 'View Journey',
          actionLink: '/portal/journey',
          priority: daysSinceSelection > 60 && completionPercent < 30 ? 'critical' : 'warning',
          icon: 'rocket',
        });
      }
    }

    // ─── 7. Engagement Nudge: No login in last 7 days ──────────────────────────

    const lastActivity = prospect.activities[0];
    if (lastActivity) {
      const daysSinceLastActivity = Math.floor(
        (now.getTime() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastActivity >= 7) {
        // Check if there's new data to reference
        const latestSnapshot = recentSnapshots[0];
        const prevSnapshot = recentSnapshots[1];
        let nudgeMessage = 'Check in on your latest performance data and stay engaged with your franchise.';

        if (latestSnapshot && prevSnapshot) {
          const revenueChange = Number(latestSnapshot.grossRevenue) - Number(prevSnapshot.grossRevenue);
          if (revenueChange > 0) {
            nudgeMessage = `Revenue is up $${revenueChange.toLocaleString()} since last month! Log in to see your full performance report.`;
          }
        }

        insights.push({
          id: 'engagement-nudge',
          type: 'engagement',
          title: 'Welcome Back!',
          message: nudgeMessage,
          action: 'View Dashboard',
          actionLink: '/portal/my-franchise',
          priority: 'info',
          icon: 'sparkles',
        });
      }
    }

    // ─── Sort by priority and return max 5 ─────────────────────────────────────

    const priorityOrder: Record<string, number> = {
      critical: 0,
      warning: 1,
      info: 2,
      success: 3,
    };

    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    const topInsights = insights.slice(0, 5);

    return NextResponse.json({ insights: topInsights });
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
