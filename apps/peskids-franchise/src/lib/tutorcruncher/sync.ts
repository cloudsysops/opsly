import { db } from '@/lib/db';
import { TutorCruncherClient, createTCClientFromAccount } from './client';
import {
  aggregateRevenueByService,
  calculateTotalHours,
  getActiveStudentIds,
  getActiveTutorIds,
} from './revenue';
import type { TCMonthlySnapshot } from './types';
import { Decimal } from '@prisma/client/runtime/library';
import {
  getLocationMonthlyFinancials,
  getLocationIdentifier,
  isSTCDatabaseConfigured,
} from '@/lib/stc-financials';

// Get date range for a specific month
function getMonthDateRange(
  year: number,
  month: number
): { start: Date; end: Date } {
  // Month is 1-indexed (1 = January)
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59); // Last day of month
  return { start, end };
}

// Sync from Acme database for Westside/Eastside franchisees
async function syncFromSTCDatabase(
  franchiseeAccountId: string,
  location: 'westside' | 'eastside',
  year: number,
  month: number,
  prospectName: string
): Promise<TCMonthlySnapshot | null> {
  console.log(
    `[Acme Sync] Fetching data from Acme ${location} database for ${prospectName} - ${year}/${month}`
  );

  const financials = await getLocationMonthlyFinancials(location, year, month);

  if (!financials) {
    console.warn(
      `[STC Sync] No data returned for ${location} - ${year}/${month}`
    );
    return null;
  }

  console.log(
    `[STC Sync] Found ${financials.lessons} lessons, $${financials.revenue.toFixed(2)} revenue`
  );

  // Build snapshot data from STC financials
  const snapshotData: TCMonthlySnapshot = {
    year,
    month,
    grossRevenue: financials.revenue,
    homeRevenue: financials.homeRevenue,
    onlineRevenue: financials.onlineRevenue,
    retailRevenue: financials.retailRevenue,
    schoolRevenue: financials.schoolRevenue,
    otherRevenue: financials.otherRevenue,
    totalLessons: financials.lessons,
    totalHours: financials.hours,
    activeStudents: financials.students,
    activeTutors: 0, // Not tracked in STC query
    rawData: {
      source: 'stc-database',
      location,
      syncedAt: new Date().toISOString(),
      tutorPay: financials.tutorPay,
      adHocPay: financials.adHocPay,
      totalCogs: financials.totalCogs,
      grossProfit: financials.grossProfit,
      grossMarginPercent: financials.grossMarginPercent,
    },
  };

  return snapshotData;
}

// Sync TutorCruncher data for a specific franchisee and month
export async function syncFranchiseeMonth(
  franchiseeAccountId: string,
  year: number,
  month: number
): Promise<TCMonthlySnapshot | null> {
  // Get franchisee account with TC credentials and prospect info
  const account = await db.franchiseeAccount.findUnique({
    where: { id: franchiseeAccountId },
    include: {
      prospect: {
        select: { firstName: true, lastName: true, preferredTerritory: true },
      },
    },
  });

  if (!account) {
    throw new Error(`Franchisee account not found: ${franchiseeAccountId}`);
  }

  const prospectName = `${account.prospect.firstName} ${account.prospect.lastName}`;

  // Check if this is a Westside or Eastside franchisee that should use STC database
  const stcLocation = getLocationIdentifier(account.prospect.preferredTerritory || '');

  let snapshotData: TCMonthlySnapshot | null = null;

  if (stcLocation && isSTCDatabaseConfigured()) {
    // Use STC database for Westside/Eastside
    snapshotData = await syncFromSTCDatabase(
      franchiseeAccountId,
      stcLocation,
      year,
      month,
      prospectName
    );
  } else if (account.tutorCruncherBase && account.tutorCruncherToken) {
    // Fall back to TutorCruncher API
    const client = createTCClientFromAccount(
      franchiseeAccountId,
      account.tutorCruncherBase,
      account.tutorCruncherToken
    );

    // Get date range for the month
    const { start, end } = getMonthDateRange(year, month);

    console.log(
      `[TC Sync] Fetching data for ${prospectName} - ${year}/${month}`
    );

    // Fetch completed appointments
    const appointments = await client.getCompletedAppointments(start, end);

    console.log(
      `[TC Sync] Found ${appointments.length} completed appointments`
    );

    // Calculate revenue by service type
    const revenue = aggregateRevenueByService(appointments);

    // Calculate activity metrics
    const totalHours = calculateTotalHours(appointments);
    const activeStudents = getActiveStudentIds(appointments);
    const activeTutors = getActiveTutorIds(appointments);

    // Build snapshot data
    snapshotData = {
      year,
      month,
      grossRevenue: revenue.total,
      homeRevenue: revenue.home,
      onlineRevenue: revenue.online,
      retailRevenue: revenue.retail,
      schoolRevenue: revenue.school,
      otherRevenue: revenue.other,
      totalLessons: appointments.length,
      totalHours: Math.round(totalHours * 100) / 100,
      activeStudents: activeStudents.size,
      activeTutors: activeTutors.size,
      rawData: {
        source: 'tutorcruncher-api',
        appointmentCount: appointments.length,
        syncedAt: new Date().toISOString(),
      },
    };
  } else {
    console.warn(
      `No data source configured for franchisee: ${franchiseeAccountId} (${prospectName})`
    );
    return null;
  }

  if (!snapshotData) {
    return null;
  }

  // Upsert snapshot to database
  await db.tutorCruncherSnapshot.upsert({
    where: {
      franchiseeAccountId_year_month: {
        franchiseeAccountId,
        year,
        month,
      },
    },
    create: {
      franchiseeAccountId,
      year,
      month,
      grossRevenue: new Decimal(snapshotData.grossRevenue),
      homeRevenue: new Decimal(snapshotData.homeRevenue),
      onlineRevenue: new Decimal(snapshotData.onlineRevenue),
      retailRevenue: new Decimal(snapshotData.retailRevenue),
      schoolRevenue: new Decimal(snapshotData.schoolRevenue),
      otherRevenue: new Decimal(snapshotData.otherRevenue),
      totalLessons: snapshotData.totalLessons,
      totalHours: new Decimal(snapshotData.totalHours),
      activeStudents: snapshotData.activeStudents,
      activeTutors: snapshotData.activeTutors,
      rawData: snapshotData.rawData as object,
    },
    update: {
      grossRevenue: new Decimal(snapshotData.grossRevenue),
      homeRevenue: new Decimal(snapshotData.homeRevenue),
      onlineRevenue: new Decimal(snapshotData.onlineRevenue),
      retailRevenue: new Decimal(snapshotData.retailRevenue),
      schoolRevenue: new Decimal(snapshotData.schoolRevenue),
      otherRevenue: new Decimal(snapshotData.otherRevenue),
      totalLessons: snapshotData.totalLessons,
      totalHours: new Decimal(snapshotData.totalHours),
      activeStudents: snapshotData.activeStudents,
      activeTutors: snapshotData.activeTutors,
      rawData: snapshotData.rawData as object,
    },
  });

  // Update franchisee account cached revenue (for current month)
  const now = new Date();
  if (year === now.getFullYear() && month === now.getMonth() + 1) {
    await db.franchiseeAccount.update({
      where: { id: franchiseeAccountId },
      data: {
        currentMonthRevenue: new Decimal(snapshotData.grossRevenue),
        lastSyncAt: new Date(),
      },
    });
  }

  console.log(
    `[TC Sync] Snapshot saved: $${snapshotData.grossRevenue.toFixed(2)} revenue, ${snapshotData.totalLessons} lessons`
  );

  return snapshotData;
}

// Sync all franchisees for a specific month
export async function syncAllFranchiseesMonth(
  year: number,
  month: number
): Promise<Map<string, TCMonthlySnapshot | null>> {
  const results = new Map<string, TCMonthlySnapshot | null>();

  // Get all franchisee accounts - either with TC credentials OR STC-eligible territories
  const accounts = await db.franchiseeAccount.findMany({
    where: {
      prospect: {
        pipelineStage: 'SELECTED',
      },
    },
    select: {
      id: true,
      tutorCruncherBase: true,
      tutorCruncherToken: true,
      prospect: {
        select: { firstName: true, lastName: true, preferredTerritory: true },
      },
    },
  });

  // Filter to only accounts that have a valid data source
  const syncableAccounts = accounts.filter((account) => {
    // Check for STC database (Westside/Eastside)
    const stcLocation = getLocationIdentifier(account.prospect.preferredTerritory || '');
    if (stcLocation && isSTCDatabaseConfigured()) {
      return true;
    }
    // Check for TutorCruncher credentials
    if (account.tutorCruncherBase && account.tutorCruncherToken) {
      return true;
    }
    return false;
  });

  console.log(
    `[Sync] Syncing ${syncableAccounts.length} franchisees for ${year}/${month}`
  );

  for (const account of syncableAccounts) {
    try {
      const snapshot = await syncFranchiseeMonth(account.id, year, month);
      results.set(account.id, snapshot);
    } catch (error) {
      console.error(
        `[Sync] Error syncing ${account.prospect.firstName} ${account.prospect.lastName}:`,
        error
      );
      results.set(account.id, null);
    }
  }

  return results;
}

// Sync current month for all franchisees
export async function syncCurrentMonth(): Promise<
  Map<string, TCMonthlySnapshot | null>
> {
  const now = new Date();
  return syncAllFranchiseesMonth(now.getFullYear(), now.getMonth() + 1);
}

// Sync previous month for all franchisees (for end-of-month processing)
export async function syncPreviousMonth(): Promise<
  Map<string, TCMonthlySnapshot | null>
> {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return syncAllFranchiseesMonth(
    lastMonth.getFullYear(),
    lastMonth.getMonth() + 1
  );
}

// Calculate YTD revenue for a franchisee
export async function calculateYTDRevenue(
  franchiseeAccountId: string
): Promise<number> {
  const year = new Date().getFullYear();

  const snapshots = await db.tutorCruncherSnapshot.findMany({
    where: {
      franchiseeAccountId,
      year,
    },
    select: {
      grossRevenue: true,
    },
  });

  return snapshots.reduce(
    (total, s) => total + Number(s.grossRevenue),
    0
  );
}

// Update YTD revenue for all franchisees
export async function updateAllYTDRevenue(): Promise<void> {
  const accounts = await db.franchiseeAccount.findMany({
    select: { id: true },
  });

  for (const account of accounts) {
    const ytd = await calculateYTDRevenue(account.id);
    await db.franchiseeAccount.update({
      where: { id: account.id },
      data: { ytdRevenue: new Decimal(ytd) },
    });
  }
}

// Verify TC credentials for a franchisee account
export async function verifyTCCredentials(
  baseUrl: string,
  token: string
): Promise<boolean> {
  const client = new TutorCruncherClient({
    id: 'verification',
    name: 'Verification',
    baseUrl,
    token,
  });

  return client.healthCheck();
}
