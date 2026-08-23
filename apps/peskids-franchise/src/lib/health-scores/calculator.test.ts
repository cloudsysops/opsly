import { describe, it, expect } from "vitest";
import {
  calculateFinancialScore,
  calculateOperationalScore,
  calculateComplianceScore,
  calculateEngagementScore,
  calculateGrowthScore,
  determineRiskLevel,
  determineTrend,
  identifyRiskFactors,
  generateRecommendations,
  calculateMedian,
} from "@/lib/health-scores/calculator";

// ---------------------------------------------------------------------------
// calculateMedian
// ---------------------------------------------------------------------------
describe("calculateMedian", () => {
  it("returns 0 for empty array", () => {
    expect(calculateMedian([])).toBe(0);
  });

  it("returns the single value for a one-element array", () => {
    expect(calculateMedian([42])).toBe(42);
  });

  it("returns the middle value for an odd-length array", () => {
    expect(calculateMedian([3, 1, 2])).toBe(2);
  });

  it("returns the average of two middle values for an even-length array", () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("handles unsorted input correctly", () => {
    expect(calculateMedian([10, 1, 5, 8, 3])).toBe(5);
  });

  it("does not mutate the original array", () => {
    const arr = [5, 3, 1, 4, 2];
    calculateMedian(arr);
    expect(arr).toEqual([5, 3, 1, 4, 2]);
  });

  it("handles negative values", () => {
    expect(calculateMedian([-10, -5, -1])).toBe(-5);
  });

  it("handles identical values", () => {
    expect(calculateMedian([7, 7, 7, 7])).toBe(7);
  });

  it("handles two elements", () => {
    expect(calculateMedian([10, 20])).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// calculateFinancialScore
// ---------------------------------------------------------------------------
describe("calculateFinancialScore", () => {
  it("returns 50 when snapshot is null", () => {
    expect(calculateFinancialScore(null, 1000)).toBe(50);
  });

  it("returns 50 when snapshot is undefined", () => {
    expect(calculateFinancialScore(undefined, 1000)).toBe(50);
  });

  it("returns 70 when network median is 0", () => {
    expect(calculateFinancialScore({ grossRevenue: 500 }, 0)).toBe(70);
  });

  it("returns 70 when revenue exactly equals the median", () => {
    expect(calculateFinancialScore({ grossRevenue: 1000 }, 1000)).toBe(70);
  });

  it("adds bonus for revenue above median (10% above = +3)", () => {
    // 110% of median => bonus = (10 / 10) * 3 = 3
    expect(calculateFinancialScore({ grossRevenue: 1100 }, 1000)).toBe(73);
  });

  it("adds bonus for revenue well above median", () => {
    // 200% of median => bonus = min(30, (100 / 10) * 3) = min(30, 30) = 30
    expect(calculateFinancialScore({ grossRevenue: 2000 }, 1000)).toBe(100);
  });

  it("caps the score at 100 for very high revenue", () => {
    // 500% of median => bonus = min(30, (400 / 10) * 3) = min(30, 120) = 30
    expect(calculateFinancialScore({ grossRevenue: 5000 }, 1000)).toBe(100);
  });

  it("applies penalty for revenue below median (10% below = -7)", () => {
    // 90% of median => penalty = (10 / 10) * 7 = 7
    expect(calculateFinancialScore({ grossRevenue: 900 }, 1000)).toBe(63);
  });

  it("applies larger penalty for revenue well below median", () => {
    // 50% of median => penalty = (50 / 10) * 7 = 35
    expect(calculateFinancialScore({ grossRevenue: 500 }, 1000)).toBe(35);
  });

  it("clamps to 0 for zero revenue against nonzero median", () => {
    // 0% of median => penalty = (100 / 10) * 7 = 70 => max(0, 70 - 70) = 0
    expect(calculateFinancialScore({ grossRevenue: 0 }, 1000)).toBe(0);
  });

  it("clamps to 0 and does not go negative", () => {
    // Negative revenue scenario: still clamps to 0
    const score = calculateFinancialScore({ grossRevenue: -500 }, 1000);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("handles string grossRevenue by coercing via Number()", () => {
    expect(calculateFinancialScore({ grossRevenue: "1000" }, 1000)).toBe(70);
  });

  it("handles Decimal-like objects via Number()", () => {
    // Prisma Decimal values have toString() that Number() can parse
    const decimalLike = { toString: () => "1500", grossRevenue: "1500" };
    expect(calculateFinancialScore({ grossRevenue: decimalLike.grossRevenue }, 1000)).toBe(
      calculateFinancialScore({ grossRevenue: 1500 }, 1000)
    );
  });
});

// ---------------------------------------------------------------------------
// calculateOperationalScore
// ---------------------------------------------------------------------------
describe("calculateOperationalScore", () => {
  it("returns 50 when snapshot is null", () => {
    expect(calculateOperationalScore(null)).toBe(50);
  });

  it("returns 50 when snapshot is undefined", () => {
    expect(calculateOperationalScore(undefined)).toBe(50);
  });

  it("returns base score of 70 with no lessons/students/tutors fields", () => {
    // No fields => totalLessons=undefined=>0, activeStudents=undefined=>0, activeTutors=undefined=>0
    // lessons < 10 => -15, students < 5 => -10, tutors < 2 => -10
    // 70 - 15 - 10 - 10 = 35
    expect(calculateOperationalScore({})).toBe(35);
  });

  it("applies -15 penalty for lessons < 10", () => {
    const snapshot = { totalLessons: 5, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons -15, students +5, tutors +0 => 60
    expect(calculateOperationalScore(snapshot)).toBe(60);
  });

  it("applies no lesson bonus/penalty for 10-24 lessons", () => {
    const snapshot = { totalLessons: 15, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +0, students +5, tutors +0 => 75
    expect(calculateOperationalScore(snapshot)).toBe(75);
  });

  it("applies +5 for 25-49 lessons", () => {
    const snapshot = { totalLessons: 30, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +5, students +5, tutors +0 => 80
    expect(calculateOperationalScore(snapshot)).toBe(80);
  });

  it("applies +10 for 50-99 lessons", () => {
    const snapshot = { totalLessons: 75, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +10, students +5, tutors +0 => 85
    expect(calculateOperationalScore(snapshot)).toBe(85);
  });

  it("applies +15 for 100+ lessons", () => {
    const snapshot = { totalLessons: 150, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +15, students +5, tutors +0 => 90
    expect(calculateOperationalScore(snapshot)).toBe(90);
  });

  it("applies -10 for students < 5", () => {
    const snapshot = { totalLessons: 50, activeStudents: 3, activeTutors: 3 };
    // base 70, lessons +10, students -10, tutors +0 => 70
    expect(calculateOperationalScore(snapshot)).toBe(70);
  });

  it("applies no student bonus/penalty for 5-14 students", () => {
    const snapshot = { totalLessons: 50, activeStudents: 10, activeTutors: 3 };
    // base 70, lessons +10, students +0, tutors +0 => 80
    expect(calculateOperationalScore(snapshot)).toBe(80);
  });

  it("applies +5 for 15-29 students", () => {
    const snapshot = { totalLessons: 50, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +10, students +5, tutors +0 => 85
    expect(calculateOperationalScore(snapshot)).toBe(85);
  });

  it("applies +10 for 30+ students", () => {
    const snapshot = { totalLessons: 50, activeStudents: 40, activeTutors: 3 };
    // base 70, lessons +10, students +10, tutors +0 => 90
    expect(calculateOperationalScore(snapshot)).toBe(90);
  });

  it("applies -10 for tutors < 2", () => {
    const snapshot = { totalLessons: 50, activeStudents: 20, activeTutors: 1 };
    // base 70, lessons +10, students +5, tutors -10 => 75
    expect(calculateOperationalScore(snapshot)).toBe(75);
  });

  it("applies no tutor bonus/penalty for 2-4 tutors", () => {
    const snapshot = { totalLessons: 50, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +10, students +5, tutors +0 => 85
    expect(calculateOperationalScore(snapshot)).toBe(85);
  });

  it("applies +5 for 5+ tutors", () => {
    const snapshot = { totalLessons: 50, activeStudents: 20, activeTutors: 6 };
    // base 70, lessons +10, students +5, tutors +5 => 90
    expect(calculateOperationalScore(snapshot)).toBe(90);
  });

  it("clamps to max 100", () => {
    const snapshot = { totalLessons: 200, activeStudents: 50, activeTutors: 10 };
    // base 70, lessons +15, students +10, tutors +5 = 100
    expect(calculateOperationalScore(snapshot)).toBe(100);
  });

  it("clamps to min 0", () => {
    // All penalties: lessons < 10 => -15, students < 5 => -10, tutors < 2 => -10
    // 70 - 15 - 10 - 10 = 35, not negative, but let's verify clamping exists
    const snapshot = { totalLessons: 0, activeStudents: 0, activeTutors: 0 };
    const score = calculateOperationalScore(snapshot);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(35);
  });

  // Boundary tests
  it("handles exact boundary at 10 lessons (no penalty, no bonus)", () => {
    const snapshot = { totalLessons: 10, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +0 (10 is not < 10 but not >= 25), students +5, tutors +0 => 75
    expect(calculateOperationalScore(snapshot)).toBe(75);
  });

  it("handles exact boundary at 25 lessons (+5)", () => {
    const snapshot = { totalLessons: 25, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +5, students +5, tutors +0 => 80
    expect(calculateOperationalScore(snapshot)).toBe(80);
  });

  it("handles exact boundary at 50 lessons (+10)", () => {
    const snapshot = { totalLessons: 50, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +10, students +5, tutors +0 => 85
    expect(calculateOperationalScore(snapshot)).toBe(85);
  });

  it("handles exact boundary at 100 lessons (+15)", () => {
    const snapshot = { totalLessons: 100, activeStudents: 20, activeTutors: 3 };
    // base 70, lessons +15, students +5, tutors +0 => 90
    expect(calculateOperationalScore(snapshot)).toBe(90);
  });

  it("handles exact boundary at 5 students (no penalty, no bonus)", () => {
    const snapshot = { totalLessons: 50, activeStudents: 5, activeTutors: 3 };
    // base 70, lessons +10, students +0, tutors +0 => 80
    expect(calculateOperationalScore(snapshot)).toBe(80);
  });

  it("handles exact boundary at 15 students (+5)", () => {
    const snapshot = { totalLessons: 50, activeStudents: 15, activeTutors: 3 };
    expect(calculateOperationalScore(snapshot)).toBe(85);
  });

  it("handles exact boundary at 30 students (+10)", () => {
    const snapshot = { totalLessons: 50, activeStudents: 30, activeTutors: 3 };
    expect(calculateOperationalScore(snapshot)).toBe(90);
  });

  it("handles exact boundary at 2 tutors (no penalty)", () => {
    const snapshot = { totalLessons: 50, activeStudents: 20, activeTutors: 2 };
    // base 70, lessons +10, students +5, tutors +0 => 85
    expect(calculateOperationalScore(snapshot)).toBe(85);
  });

  it("handles exact boundary at 5 tutors (+5)", () => {
    const snapshot = { totalLessons: 50, activeStudents: 20, activeTutors: 5 };
    expect(calculateOperationalScore(snapshot)).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// calculateComplianceScore
// ---------------------------------------------------------------------------
describe("calculateComplianceScore", () => {
  it("returns 50 for empty certifications array", () => {
    expect(calculateComplianceScore([])).toBe(50);
  });

  it("returns 60 for one ACTIVE certification (no expiry concern)", () => {
    const certs = [{ status: "ACTIVE", expiresAt: "2030-01-01" }];
    expect(calculateComplianceScore(certs)).toBe(60);
  });

  it("returns up to 100 for many ACTIVE certifications", () => {
    // 5 active => 50 + 5*10 = 100
    const certs = Array.from({ length: 5 }, () => ({
      status: "ACTIVE",
      expiresAt: "2030-01-01",
    }));
    expect(calculateComplianceScore(certs)).toBe(100);
  });

  it("caps at 100 even with more than 5 ACTIVE certifications", () => {
    const certs = Array.from({ length: 10 }, () => ({
      status: "ACTIVE",
      expiresAt: "2030-01-01",
    }));
    // 50 + 10*10 = 150 => min(100, 150) = 100
    expect(calculateComplianceScore(certs)).toBe(100);
  });

  it("subtracts 15 per EXPIRED certification", () => {
    const certs = [
      { status: "ACTIVE", expiresAt: "2030-01-01" },
      { status: "EXPIRED", expiresAt: "2020-01-01" },
    ];
    // validCount=1 => score = 50 + 10 = 60, expired=1 => 60 - 15 = 45
    expect(calculateComplianceScore(certs)).toBe(45);
  });

  it("subtracts 5 per expiring-soon ACTIVE certification", () => {
    const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days from now
    const certs = [
      { status: "ACTIVE", expiresAt: soon },
      { status: "ACTIVE", expiresAt: "2030-01-01" },
    ];
    // validCount=2 => score = 50 + 20 = 70, expiringSoon=1 => 70 - 5 = 65
    expect(calculateComplianceScore(certs)).toBe(65);
  });

  it("clamps to 0 with many expired certifications", () => {
    const certs = Array.from({ length: 10 }, () => ({
      status: "EXPIRED",
      expiresAt: "2020-01-01",
    }));
    // validCount=0 => score = 50, expired=10 => 50 - 150 = -100 => max(0, -100) = 0
    expect(calculateComplianceScore(certs)).toBe(0);
  });

  it("handles certifications with no expiresAt (ACTIVE, not expiring soon)", () => {
    const certs = [{ status: "ACTIVE", expiresAt: null }];
    // validCount=1, expiresAt is null => new Date(null) won't be < threshold,
    // so expiringSoon=0. score = 50 + 10 = 60
    expect(calculateComplianceScore(certs)).toBe(60);
  });

  it("does not count non-ACTIVE, non-EXPIRED statuses", () => {
    const certs = [{ status: "PENDING", expiresAt: "2030-01-01" }];
    // validCount=0, expiredCount=0 => score = 50
    expect(calculateComplianceScore(certs)).toBe(50);
  });

  it("combines active, expiring-soon, and expired correctly", () => {
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const certs = [
      { status: "ACTIVE", expiresAt: "2030-01-01" }, // valid, not expiring soon
      { status: "ACTIVE", expiresAt: soon },          // valid, expiring soon
      { status: "ACTIVE", expiresAt: "2030-06-01" },  // valid, not expiring soon
      { status: "EXPIRED", expiresAt: "2020-01-01" }, // expired
    ];
    // validCount=3 => score = min(100, 50 + 30) = 80
    // expiringSoon=1 => 80 - 5 = 75
    // expired=1 => 75 - 15 = 60
    expect(calculateComplianceScore(certs)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// calculateEngagementScore
// ---------------------------------------------------------------------------
describe("calculateEngagementScore", () => {
  it("returns base score of 70 with empty object", () => {
    // No optional arrays => no bonuses
    expect(calculateEngagementScore({})).toBe(70);
  });

  it("adds 10 for having tcSnapshots", () => {
    expect(calculateEngagementScore({ tcSnapshots: [{}] })).toBe(80);
  });

  it("adds 10 for having certifications", () => {
    expect(calculateEngagementScore({ certifications: [{}] })).toBe(80);
  });

  it("adds 10 for having markets", () => {
    expect(calculateEngagementScore({ markets: [{}] })).toBe(80);
  });

  it("adds all bonuses for having all data present", () => {
    const franchisee = {
      tcSnapshots: [{}],
      certifications: [{}],
      markets: [{}],
    };
    expect(calculateEngagementScore(franchisee)).toBe(100);
  });

  it("does not add bonus for empty arrays (length 0)", () => {
    const franchisee = {
      tcSnapshots: [],
      certifications: [],
      markets: [],
    };
    // length > 0 is false for empty arrays
    expect(calculateEngagementScore(franchisee)).toBe(70);
  });

  it("handles partial data presence", () => {
    const franchisee = {
      tcSnapshots: [{}],
      certifications: [],
      markets: [{}],
    };
    // base 70 + 10 (snapshots) + 0 (no certs) + 10 (markets) = 90
    expect(calculateEngagementScore(franchisee)).toBe(90);
  });

  it("clamps to max 100", () => {
    // Max is 70 + 10 + 10 + 10 = 100, exactly at cap
    const franchisee = {
      tcSnapshots: [{}, {}],
      certifications: [{}],
      markets: [{}, {}, {}],
    };
    expect(calculateEngagementScore(franchisee)).toBe(100);
  });

  it("never returns below 0", () => {
    const score = calculateEngagementScore({});
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// calculateGrowthScore
// ---------------------------------------------------------------------------
describe("calculateGrowthScore", () => {
  it("returns 50 when currentSnapshot is null", () => {
    expect(calculateGrowthScore(null, { compositeScore: 80 })).toBe(50);
  });

  it("returns 50 when currentSnapshot is undefined", () => {
    expect(calculateGrowthScore(undefined, { compositeScore: 80 })).toBe(50);
  });

  it("returns 70 when prevScore is null (no previous data)", () => {
    expect(calculateGrowthScore({ grossRevenue: 1000 }, null)).toBe(70);
  });

  it("returns 70 when prevScore is undefined", () => {
    expect(calculateGrowthScore({ grossRevenue: 1000 }, undefined)).toBe(70);
  });

  it("adds +20 for improvement > 10%", () => {
    // previousComposite=100, currentRevenue=120 => improvement = (120-100)/100 = 0.2
    expect(calculateGrowthScore({ grossRevenue: 120 }, { compositeScore: 100 })).toBe(90);
  });

  it("adds +10 for improvement between 5% and 10%", () => {
    // previousComposite=100, currentRevenue=108 => improvement = 0.08
    expect(calculateGrowthScore({ grossRevenue: 108 }, { compositeScore: 100 })).toBe(80);
  });

  it("subtracts 20 for decline > 10%", () => {
    // previousComposite=100, currentRevenue=80 => improvement = (80-100)/100 = -0.2
    expect(calculateGrowthScore({ grossRevenue: 80 }, { compositeScore: 100 })).toBe(50);
  });

  it("subtracts 10 for decline between 5% and 10%", () => {
    // previousComposite=100, currentRevenue=92 => improvement = -0.08
    expect(calculateGrowthScore({ grossRevenue: 92 }, { compositeScore: 100 })).toBe(60);
  });

  it("returns base 70 for minimal change (within +/- 5%)", () => {
    // previousComposite=100, currentRevenue=102 => improvement = 0.02
    expect(calculateGrowthScore({ grossRevenue: 102 }, { compositeScore: 100 })).toBe(70);
  });

  it("uses 70 as default previousComposite when compositeScore is falsy", () => {
    // compositeScore is 0 => previousComposite = 70
    // currentRevenue = 100, improvement = (100-70)/70 = 0.4286 => > 0.1 => +20
    expect(calculateGrowthScore({ grossRevenue: 100 }, { compositeScore: 0 })).toBe(90);
  });

  it("clamps to 0 minimum", () => {
    const score = calculateGrowthScore({ grossRevenue: 0 }, { compositeScore: 100 });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("clamps to 100 maximum", () => {
    const score = calculateGrowthScore({ grossRevenue: 10000 }, { compositeScore: 50 });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("handles exact 10% improvement boundary", () => {
    // improvement = (110 - 100) / 100 = 0.1 => NOT > 0.1 but > 0.05 => +10
    expect(calculateGrowthScore({ grossRevenue: 110 }, { compositeScore: 100 })).toBe(80);
  });

  it("handles exact 5% improvement boundary", () => {
    // improvement = (105 - 100) / 100 = 0.05 => NOT > 0.05 => base 70
    expect(calculateGrowthScore({ grossRevenue: 105 }, { compositeScore: 100 })).toBe(70);
  });

  it("handles exact -5% decline boundary", () => {
    // improvement = (95 - 100) / 100 = -0.05 => NOT < -0.05 => base 70
    expect(calculateGrowthScore({ grossRevenue: 95 }, { compositeScore: 100 })).toBe(70);
  });

  it("handles exact -10% decline boundary", () => {
    // improvement = (90 - 100) / 100 = -0.1 => NOT < -0.1 but < -0.05 => -10
    expect(calculateGrowthScore({ grossRevenue: 90 }, { compositeScore: 100 })).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// determineRiskLevel
// ---------------------------------------------------------------------------
describe("determineRiskLevel", () => {
  const thresholds = {
    critical: 40,
    high: 55,
    elevated: 70,
    moderate: 85,
  };

  it("returns CRITICAL when score is below critical threshold", () => {
    expect(determineRiskLevel(30, thresholds)).toBe("CRITICAL");
  });

  it("returns CRITICAL when score is 0", () => {
    expect(determineRiskLevel(0, thresholds)).toBe("CRITICAL");
  });

  it("returns HIGH when score equals critical but is below high", () => {
    expect(determineRiskLevel(40, thresholds)).toBe("HIGH");
  });

  it("returns HIGH when score is between critical and high", () => {
    expect(determineRiskLevel(50, thresholds)).toBe("HIGH");
  });

  it("returns ELEVATED when score equals high but is below elevated", () => {
    expect(determineRiskLevel(55, thresholds)).toBe("ELEVATED");
  });

  it("returns ELEVATED when score is between high and elevated", () => {
    expect(determineRiskLevel(65, thresholds)).toBe("ELEVATED");
  });

  it("returns MODERATE when score equals elevated but is below moderate", () => {
    expect(determineRiskLevel(70, thresholds)).toBe("MODERATE");
  });

  it("returns MODERATE when score is between elevated and moderate", () => {
    expect(determineRiskLevel(80, thresholds)).toBe("MODERATE");
  });

  it("returns LOW when score equals moderate threshold", () => {
    expect(determineRiskLevel(85, thresholds)).toBe("LOW");
  });

  it("returns LOW when score is above moderate threshold", () => {
    expect(determineRiskLevel(95, thresholds)).toBe("LOW");
  });

  it("returns LOW for a perfect score of 100", () => {
    expect(determineRiskLevel(100, thresholds)).toBe("LOW");
  });

  it("works with custom thresholds", () => {
    const custom = { critical: 20, high: 40, elevated: 60, moderate: 80 };
    expect(determineRiskLevel(10, custom)).toBe("CRITICAL");
    expect(determineRiskLevel(30, custom)).toBe("HIGH");
    expect(determineRiskLevel(50, custom)).toBe("ELEVATED");
    expect(determineRiskLevel(70, custom)).toBe("MODERATE");
    expect(determineRiskLevel(90, custom)).toBe("LOW");
  });
});

// ---------------------------------------------------------------------------
// determineTrend
// ---------------------------------------------------------------------------
describe("determineTrend", () => {
  it("returns NEW when previous is null", () => {
    expect(determineTrend(50, null)).toBe("NEW");
  });

  it("returns NEW when previous is undefined", () => {
    expect(determineTrend(50, undefined)).toBe("NEW");
  });

  it("returns IMPROVING when change is greater than 5", () => {
    expect(determineTrend(80, 70)).toBe("IMPROVING");
  });

  it("returns DECLINING when change is less than -5", () => {
    expect(determineTrend(60, 70)).toBe("DECLINING");
  });

  it("returns STABLE when change is exactly 5", () => {
    // change = 5, not > 5 => STABLE
    expect(determineTrend(75, 70)).toBe("STABLE");
  });

  it("returns STABLE when change is exactly -5", () => {
    // change = -5, not < -5 => STABLE
    expect(determineTrend(65, 70)).toBe("STABLE");
  });

  it("returns STABLE when current equals previous", () => {
    expect(determineTrend(70, 70)).toBe("STABLE");
  });

  it("returns STABLE for small positive changes", () => {
    expect(determineTrend(73, 70)).toBe("STABLE");
  });

  it("returns STABLE for small negative changes", () => {
    expect(determineTrend(67, 70)).toBe("STABLE");
  });

  it("returns IMPROVING for change of 5.01", () => {
    expect(determineTrend(75.01, 70)).toBe("IMPROVING");
  });

  it("returns DECLINING for change of -5.01", () => {
    expect(determineTrend(64.99, 70)).toBe("DECLINING");
  });

  it("handles previous of 0", () => {
    // current = 10, previous = 0 => change = 10 > 5 => IMPROVING
    expect(determineTrend(10, 0)).toBe("IMPROVING");
  });
});

// ---------------------------------------------------------------------------
// identifyRiskFactors
// ---------------------------------------------------------------------------
describe("identifyRiskFactors", () => {
  it("returns empty array when all scores are >= 50", () => {
    const data = {
      financialScore: 80,
      operationalScore: 70,
      complianceScore: 60,
      engagementScore: 50,
      growthScore: 75,
      snapshot: {},
    };
    expect(identifyRiskFactors(data)).toEqual([]);
  });

  it("identifies low financial performance risk factor", () => {
    const data = {
      financialScore: 30,
      operationalScore: 70,
      complianceScore: 70,
      engagementScore: 70,
      growthScore: 70,
      snapshot: {},
    };
    const factors = identifyRiskFactors(data);
    expect(factors).toHaveLength(1);
    expect(factors[0].factor).toBe("Low Financial Performance");
    expect(factors[0].impact).toBe("HIGH");
  });

  it("identifies operational issues risk factor", () => {
    const data = {
      financialScore: 70,
      operationalScore: 40,
      complianceScore: 70,
      engagementScore: 70,
      growthScore: 70,
      snapshot: {},
    };
    const factors = identifyRiskFactors(data);
    expect(factors).toHaveLength(1);
    expect(factors[0].factor).toBe("Operational Issues");
    expect(factors[0].impact).toBe("HIGH");
  });

  it("identifies compliance gaps risk factor", () => {
    const data = {
      financialScore: 70,
      operationalScore: 70,
      complianceScore: 30,
      engagementScore: 70,
      growthScore: 70,
      snapshot: {},
    };
    const factors = identifyRiskFactors(data);
    expect(factors).toHaveLength(1);
    expect(factors[0].factor).toBe("Compliance Gaps");
    expect(factors[0].impact).toBe("MEDIUM");
  });

  it("identifies low engagement risk factor", () => {
    const data = {
      financialScore: 70,
      operationalScore: 70,
      complianceScore: 70,
      engagementScore: 40,
      growthScore: 70,
      snapshot: {},
    };
    const factors = identifyRiskFactors(data);
    expect(factors).toHaveLength(1);
    expect(factors[0].factor).toBe("Low Engagement");
    expect(factors[0].impact).toBe("MEDIUM");
  });

  it("identifies declining growth risk factor", () => {
    const data = {
      financialScore: 70,
      operationalScore: 70,
      complianceScore: 70,
      engagementScore: 70,
      growthScore: 30,
      snapshot: {},
    };
    const factors = identifyRiskFactors(data);
    expect(factors).toHaveLength(1);
    expect(factors[0].factor).toBe("Declining Growth");
    expect(factors[0].impact).toBe("MEDIUM");
  });

  it("identifies multiple risk factors when all scores are low", () => {
    const data = {
      financialScore: 20,
      operationalScore: 30,
      complianceScore: 40,
      engagementScore: 10,
      growthScore: 0,
      snapshot: {},
    };
    const factors = identifyRiskFactors(data);
    expect(factors).toHaveLength(5);
    expect(factors.map((f) => f.factor)).toEqual([
      "Low Financial Performance",
      "Operational Issues",
      "Compliance Gaps",
      "Low Engagement",
      "Declining Growth",
    ]);
  });

  it("does not flag scores at exactly 50 (threshold is < 50)", () => {
    const data = {
      financialScore: 50,
      operationalScore: 50,
      complianceScore: 50,
      engagementScore: 50,
      growthScore: 50,
      snapshot: {},
    };
    expect(identifyRiskFactors(data)).toEqual([]);
  });

  it("flags score at 49 (just below threshold)", () => {
    const data = {
      financialScore: 49,
      operationalScore: 70,
      complianceScore: 70,
      engagementScore: 70,
      growthScore: 70,
      snapshot: {},
    };
    const factors = identifyRiskFactors(data);
    expect(factors).toHaveLength(1);
    expect(factors[0].factor).toBe("Low Financial Performance");
  });
});

// ---------------------------------------------------------------------------
// generateRecommendations
// ---------------------------------------------------------------------------
describe("generateRecommendations", () => {
  it("returns empty array when all scores are above thresholds", () => {
    const data = {
      financialScore: 80,
      operationalScore: 80,
      complianceScore: 80,
      engagementScore: 80,
      growthScore: 80,
      riskFactors: [],
    };
    expect(generateRecommendations(data)).toEqual([]);
  });

  it("recommends revenue coaching for low financial score (< 60)", () => {
    const data = {
      financialScore: 50,
      operationalScore: 80,
      complianceScore: 80,
      engagementScore: 80,
      growthScore: 80,
      riskFactors: [],
    };
    const recs = generateRecommendations(data);
    expect(recs).toHaveLength(1);
    expect(recs[0].priority).toBe("HIGH");
    expect(recs[0].category).toBe("Financial");
    expect(recs[0].action).toContain("revenue growth coaching");
  });

  it("recommends operational review for low operational score (< 60)", () => {
    const data = {
      financialScore: 80,
      operationalScore: 50,
      complianceScore: 80,
      engagementScore: 80,
      growthScore: 80,
      riskFactors: [],
    };
    const recs = generateRecommendations(data);
    expect(recs).toHaveLength(1);
    expect(recs[0].priority).toBe("HIGH");
    expect(recs[0].category).toBe("Operational");
    expect(recs[0].action).toContain("service delivery");
  });

  it("recommends certification update for low compliance score (< 70)", () => {
    const data = {
      financialScore: 80,
      operationalScore: 80,
      complianceScore: 60,
      engagementScore: 80,
      growthScore: 80,
      riskFactors: [],
    };
    const recs = generateRecommendations(data);
    expect(recs).toHaveLength(1);
    expect(recs[0].priority).toBe("MEDIUM");
    expect(recs[0].category).toBe("Compliance");
    expect(recs[0].action).toContain("certifications");
  });

  it("recommends increased communication for low engagement score (< 60)", () => {
    const data = {
      financialScore: 80,
      operationalScore: 80,
      complianceScore: 80,
      engagementScore: 50,
      growthScore: 80,
      riskFactors: [],
    };
    const recs = generateRecommendations(data);
    expect(recs).toHaveLength(1);
    expect(recs[0].priority).toBe("MEDIUM");
    expect(recs[0].category).toBe("Engagement");
    expect(recs[0].action).toContain("communication");
  });

  it("recommends market expansion for low growth score (< 60)", () => {
    const data = {
      financialScore: 80,
      operationalScore: 80,
      complianceScore: 80,
      engagementScore: 80,
      growthScore: 40,
      riskFactors: [],
    };
    const recs = generateRecommendations(data);
    expect(recs).toHaveLength(1);
    expect(recs[0].priority).toBe("MEDIUM");
    expect(recs[0].category).toBe("Growth");
    expect(recs[0].action).toContain("market expansion");
  });

  it("generates multiple recommendations when multiple scores are low", () => {
    const data = {
      financialScore: 30,
      operationalScore: 40,
      complianceScore: 50,
      engagementScore: 30,
      growthScore: 20,
      riskFactors: [],
    };
    const recs = generateRecommendations(data);
    expect(recs).toHaveLength(5);
    expect(recs.map((r) => r.category)).toEqual([
      "Financial",
      "Operational",
      "Compliance",
      "Engagement",
      "Growth",
    ]);
  });

  it("does not recommend for financial score at exactly 60", () => {
    const data = {
      financialScore: 60,
      operationalScore: 80,
      complianceScore: 80,
      engagementScore: 80,
      growthScore: 80,
      riskFactors: [],
    };
    expect(generateRecommendations(data)).toEqual([]);
  });

  it("recommends for financial score at 59 (just below threshold)", () => {
    const data = {
      financialScore: 59,
      operationalScore: 80,
      complianceScore: 80,
      engagementScore: 80,
      growthScore: 80,
      riskFactors: [],
    };
    expect(generateRecommendations(data)).toHaveLength(1);
  });

  it("does not recommend for compliance score at exactly 70", () => {
    const data = {
      financialScore: 80,
      operationalScore: 80,
      complianceScore: 70,
      engagementScore: 80,
      growthScore: 80,
      riskFactors: [],
    };
    expect(generateRecommendations(data)).toEqual([]);
  });

  it("recommends for compliance score at 69 (just below threshold)", () => {
    const data = {
      financialScore: 80,
      operationalScore: 80,
      complianceScore: 69,
      engagementScore: 80,
      growthScore: 80,
      riskFactors: [],
    };
    expect(generateRecommendations(data)).toHaveLength(1);
  });
});
