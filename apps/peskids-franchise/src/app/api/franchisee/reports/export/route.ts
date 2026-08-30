import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const REPORT_TYPE_LABELS: Record<string, string> = {
  revenue: 'Revenue Report',
  lessons: 'Lessons Report',
  students: 'Student Report',
  tutors: 'Tutor Report',
  financial: 'Financial Summary',
  performance: 'Performance Report',
};

const FIELD_LABELS: Record<string, string> = {
  grossRevenue: 'Gross Revenue',
  homeRevenue: 'Home Revenue',
  onlineRevenue: 'Online Revenue',
  retailRevenue: 'Retail Revenue',
  schoolRevenue: 'School Revenue',
  otherRevenue: 'Other Revenue',
  totalLessons: 'Total Lessons',
  activeStudents: 'Active Students',
  activeTutors: 'Active Tutors',
  totalHours: 'Total Hours',
  lessonsPerStudent: 'Lessons/Student',
  lessonsPerTutor: 'Lessons/Tutor',
  hoursPerTutor: 'Hours/Tutor',
  tutorPay: 'Tutor Pay',
  adHocPay: 'Ad Hoc Pay',
  totalCOGS: 'Total COGS',
  grossProfit: 'Gross Profit',
  profitMargin: 'Profit Margin %',
  overallScore: 'Overall Score',
  financialScore: 'Financial Score',
  operationalScore: 'Operational Score',
  complianceScore: 'Compliance Score',
  engagementScore: 'Engagement Score',
  growthScore: 'Growth Score',
};

const CURRENCY_FIELDS = new Set([
  'grossRevenue', 'homeRevenue', 'onlineRevenue', 'retailRevenue',
  'schoolRevenue', 'otherRevenue', 'tutorPay', 'adHocPay',
  'totalCOGS', 'grossProfit',
]);

// POST /api/franchisee/reports/export - Export report data as CSV
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED' || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    const body = await request.json();
    const { months, totals, averages, reportType } = body;

    if (!months || !Array.isArray(months) || months.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 400 });
    }

    // Build CSV
    const reportLabel = REPORT_TYPE_LABELS[reportType] || 'Report';
    const franchiseeName = `${prospect.firstName} ${prospect.lastName}`;

    // Get metric columns (exclude year, month, label)
    const metricKeys = Object.keys(months[0]).filter(
      (k) => k !== 'year' && k !== 'month' && k !== 'label'
    );

    // Header rows
    const csvRows: string[] = [];
    csvRows.push(`"${reportLabel} - ${franchiseeName}"`);
    csvRows.push(`"Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"`);
    csvRows.push('');

    // Column headers
    const headers = ['Period', ...metricKeys.map((k) => FIELD_LABELS[k] || k)];
    csvRows.push(headers.map((h) => `"${h}"`).join(','));

    // Data rows
    months.forEach((row: any) => {
      const values = [
        `"${row.label}"`,
        ...metricKeys.map((k) => {
          const val = Number(row[k]) || 0;
          if (CURRENCY_FIELDS.has(k)) {
            return `"$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;
          }
          if (k === 'profitMargin') {
            return `"${val.toFixed(1)}%"`;
          }
          return `"${val}"`;
        }),
      ];
      csvRows.push(values.join(','));
    });

    // Totals row
    if (totals) {
      csvRows.push('');
      const totalValues = [
        '"TOTALS"',
        ...metricKeys.map((k) => {
          const val = Number(totals[k]) || 0;
          if (CURRENCY_FIELDS.has(k)) {
            return `"$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;
          }
          if (k === 'profitMargin') {
            return `"${val.toFixed(1)}%"`;
          }
          return `"${val}"`;
        }),
      ];
      csvRows.push(totalValues.join(','));
    }

    // Averages row
    if (averages) {
      const avgValues = [
        '"AVERAGES"',
        ...metricKeys.map((k) => {
          const val = Number(averages[k]) || 0;
          if (CURRENCY_FIELDS.has(k)) {
            return `"$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;
          }
          if (k === 'profitMargin') {
            return `"${val.toFixed(1)}%"`;
          }
          return `"${val}"`;
        }),
      ];
      csvRows.push(avgValues.join(','));
    }

    const csv = csvRows.join('\n');
    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
  }
}
