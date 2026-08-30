import { describe, it, expect } from "vitest";
import { calculateFormScore, SCORING_WEIGHTS } from "@/lib/scoring/leadScoring";

// ---------------------------------------------------------------------------
// SCORING_WEIGHTS constant validation
// ---------------------------------------------------------------------------
describe("SCORING_WEIGHTS", () => {
  it("has correct visitor behavior weights", () => {
    expect(SCORING_WEIGHTS.RETURN_VISIT).toBe(10);
    expect(SCORING_WEIGHTS.EARL_CHAT).toBe(15);
    expect(SCORING_WEIGHTS.PAGE_VIEW).toBe(2);
    expect(SCORING_WEIGHTS.HIGH_VALUE_PAGE).toBe(20);
    expect(SCORING_WEIGHTS.TIME_ON_SITE_5MIN).toBe(25);
    expect(SCORING_WEIGHTS.TIME_ON_SITE_10MIN).toBe(15);
    expect(SCORING_WEIGHTS.TIME_ON_SITE_20MIN).toBe(10);
  });

  it("has correct interest level weights", () => {
    expect(SCORING_WEIGHTS.INTEREST_READY_TO_START).toBe(30);
    expect(SCORING_WEIGHTS.INTEREST_SEEKING_FUNDING).toBe(25);
    expect(SCORING_WEIGHTS.INTEREST_SERIOUSLY_CONSIDERING).toBe(20);
    expect(SCORING_WEIGHTS.INTEREST_JUST_EXPLORING).toBe(10);
    expect(SCORING_WEIGHTS.INTEREST_GATHERING_INFO).toBe(5);
  });

  it("has correct liquidity weights", () => {
    expect(SCORING_WEIGHTS.LIQUIDITY_OVER_500K).toBe(25);
    expect(SCORING_WEIGHTS.LIQUIDITY_250K_500K).toBe(20);
    expect(SCORING_WEIGHTS.LIQUIDITY_100K_250K).toBe(15);
    expect(SCORING_WEIGHTS.LIQUIDITY_50K_100K).toBe(10);
    expect(SCORING_WEIGHTS.LIQUIDITY_UNDER_50K).toBe(5);
  });

  it("has correct engagement signal weights", () => {
    expect(SCORING_WEIGHTS.VIEWED_FAQ).toBe(5);
    expect(SCORING_WEIGHTS.VIEWED_TESTIMONIALS).toBe(10);
    expect(SCORING_WEIGHTS.MULTIPLE_EARL_CHATS).toBe(10);
    expect(SCORING_WEIGHTS.DOWNLOADED_RESOURCE).toBe(15);
    expect(SCORING_WEIGHTS.WATCHED_VIDEO).toBe(10);
  });

  it("interest weights are ordered from highest to lowest intent", () => {
    expect(SCORING_WEIGHTS.INTEREST_READY_TO_START).toBeGreaterThan(
      SCORING_WEIGHTS.INTEREST_SEEKING_FUNDING
    );
    expect(SCORING_WEIGHTS.INTEREST_SEEKING_FUNDING).toBeGreaterThan(
      SCORING_WEIGHTS.INTEREST_SERIOUSLY_CONSIDERING
    );
    expect(SCORING_WEIGHTS.INTEREST_SERIOUSLY_CONSIDERING).toBeGreaterThan(
      SCORING_WEIGHTS.INTEREST_JUST_EXPLORING
    );
    expect(SCORING_WEIGHTS.INTEREST_JUST_EXPLORING).toBeGreaterThan(
      SCORING_WEIGHTS.INTEREST_GATHERING_INFO
    );
  });

  it("liquidity weights are ordered from highest to lowest", () => {
    expect(SCORING_WEIGHTS.LIQUIDITY_OVER_500K).toBeGreaterThan(
      SCORING_WEIGHTS.LIQUIDITY_250K_500K
    );
    expect(SCORING_WEIGHTS.LIQUIDITY_250K_500K).toBeGreaterThan(
      SCORING_WEIGHTS.LIQUIDITY_100K_250K
    );
    expect(SCORING_WEIGHTS.LIQUIDITY_100K_250K).toBeGreaterThan(
      SCORING_WEIGHTS.LIQUIDITY_50K_100K
    );
    expect(SCORING_WEIGHTS.LIQUIDITY_50K_100K).toBeGreaterThan(
      SCORING_WEIGHTS.LIQUIDITY_UNDER_50K
    );
  });
});

// ---------------------------------------------------------------------------
// calculateFormScore
// ---------------------------------------------------------------------------
describe("calculateFormScore", () => {
  // -------------------------------------------------------------------------
  // Interest level mapping
  // -------------------------------------------------------------------------
  describe("interest level scoring", () => {
    it("scores READY_TO_START at 30 points", () => {
      const result = calculateFormScore({
        interestLevel: "READY_TO_START",
        liquidity: null,
      });
      expect(result.total).toBe(30);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Intent",
        points: 30,
        reason: "Interest level: Ready to start",
      });
    });

    it("scores ACTIVELY_SEEKING_FUNDING at 25 points", () => {
      const result = calculateFormScore({
        interestLevel: "ACTIVELY_SEEKING_FUNDING",
        liquidity: null,
      });
      expect(result.total).toBe(25);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Intent",
        points: 25,
        reason: "Interest level: Seeking funding",
      });
    });

    it("scores SERIOUSLY_CONSIDERING at 20 points", () => {
      const result = calculateFormScore({
        interestLevel: "SERIOUSLY_CONSIDERING",
        liquidity: null,
      });
      expect(result.total).toBe(20);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Intent",
        points: 20,
        reason: "Interest level: Seriously considering",
      });
    });

    it("scores JUST_EXPLORING at 10 points", () => {
      const result = calculateFormScore({
        interestLevel: "JUST_EXPLORING",
        liquidity: null,
      });
      expect(result.total).toBe(10);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Intent",
        points: 10,
        reason: "Interest level: Just exploring",
      });
    });

    it("scores GATHERING_INFORMATION at 5 points", () => {
      const result = calculateFormScore({
        interestLevel: "GATHERING_INFORMATION",
        liquidity: null,
      });
      expect(result.total).toBe(5);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Intent",
        points: 5,
        reason: "Interest level: Gathering info",
      });
    });

    it("returns no interest score for an unknown interest level", () => {
      const result = calculateFormScore({
        interestLevel: "UNKNOWN_LEVEL",
        liquidity: null,
      });
      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it("returns no interest score for an empty string interest level", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: null,
      });
      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Liquidity level mapping
  // -------------------------------------------------------------------------
  describe("liquidity scoring", () => {
    it("scores OVER_500K at 25 points", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: "OVER_500K",
      });
      expect(result.total).toBe(25);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Financial",
        points: 25,
        reason: "Liquidity: Over $500K",
      });
    });

    it("scores RANGE_250K_500K at 20 points", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: "RANGE_250K_500K",
      });
      expect(result.total).toBe(20);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Financial",
        points: 20,
        reason: "Liquidity: $250K-$500K",
      });
    });

    it("scores RANGE_100K_250K at 15 points", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: "RANGE_100K_250K",
      });
      expect(result.total).toBe(15);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Financial",
        points: 15,
        reason: "Liquidity: $100K-$250K",
      });
    });

    it("scores RANGE_50K_100K at 10 points", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: "RANGE_50K_100K",
      });
      expect(result.total).toBe(10);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Financial",
        points: 10,
        reason: "Liquidity: $50K-$100K",
      });
    });

    it("scores UNDER_50K at 5 points", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: "UNDER_50K",
      });
      expect(result.total).toBe(5);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0]).toEqual({
        category: "Financial",
        points: 5,
        reason: "Liquidity: Under $50K",
      });
    });

    it("returns no liquidity score when liquidity is null", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: null,
      });
      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it("returns no liquidity score for an unknown liquidity value", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: "UNKNOWN_RANGE",
      });
      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it("returns no liquidity score for an empty string liquidity", () => {
      // Empty string is truthy-ish for the null check, but won't match any key
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: "",
      });
      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Combined interest + liquidity scores
  // -------------------------------------------------------------------------
  describe("combined scoring", () => {
    it("adds interest and liquidity scores together for highest tier", () => {
      const result = calculateFormScore({
        interestLevel: "READY_TO_START",
        liquidity: "OVER_500K",
      });
      expect(result.total).toBe(30 + 25);
      expect(result.breakdown).toHaveLength(2);
    });

    it("adds interest and liquidity scores together for mid tier", () => {
      const result = calculateFormScore({
        interestLevel: "SERIOUSLY_CONSIDERING",
        liquidity: "RANGE_100K_250K",
      });
      expect(result.total).toBe(20 + 15);
      expect(result.breakdown).toHaveLength(2);
    });

    it("adds interest and liquidity scores together for lowest tier", () => {
      const result = calculateFormScore({
        interestLevel: "GATHERING_INFORMATION",
        liquidity: "UNDER_50K",
      });
      expect(result.total).toBe(5 + 5);
      expect(result.breakdown).toHaveLength(2);
    });

    it("adds interest and liquidity for mixed tiers", () => {
      const result = calculateFormScore({
        interestLevel: "JUST_EXPLORING",
        liquidity: "RANGE_250K_500K",
      });
      expect(result.total).toBe(10 + 20);
      expect(result.breakdown).toHaveLength(2);
    });

    it("includes only interest when liquidity is null", () => {
      const result = calculateFormScore({
        interestLevel: "ACTIVELY_SEEKING_FUNDING",
        liquidity: null,
      });
      expect(result.total).toBe(25);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].category).toBe("Intent");
    });

    it("includes only liquidity when interest level is unknown", () => {
      const result = calculateFormScore({
        interestLevel: "NOT_A_REAL_LEVEL",
        liquidity: "RANGE_50K_100K",
      });
      expect(result.total).toBe(10);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].category).toBe("Financial");
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases and return shape
  // -------------------------------------------------------------------------
  describe("edge cases and return structure", () => {
    it("returns 0 total and empty breakdown for completely invalid input", () => {
      const result = calculateFormScore({
        interestLevel: "INVALID",
        liquidity: "INVALID",
      });
      expect(result.total).toBe(0);
      expect(result.breakdown).toEqual([]);
    });

    it("returns 0 total and empty breakdown for empty interest and null liquidity", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: null,
      });
      expect(result.total).toBe(0);
      expect(result.breakdown).toEqual([]);
    });

    it("always returns an object with total and breakdown properties", () => {
      const result = calculateFormScore({
        interestLevel: "READY_TO_START",
        liquidity: "OVER_500K",
      });
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("breakdown");
      expect(typeof result.total).toBe("number");
      expect(Array.isArray(result.breakdown)).toBe(true);
    });

    it("breakdown entries have category, points, and reason fields", () => {
      const result = calculateFormScore({
        interestLevel: "READY_TO_START",
        liquidity: "OVER_500K",
      });
      for (const entry of result.breakdown) {
        expect(entry).toHaveProperty("category");
        expect(entry).toHaveProperty("points");
        expect(entry).toHaveProperty("reason");
        expect(typeof entry.category).toBe("string");
        expect(typeof entry.points).toBe("number");
        expect(typeof entry.reason).toBe("string");
      }
    });

    it("interest breakdown uses 'Intent' category", () => {
      const result = calculateFormScore({
        interestLevel: "READY_TO_START",
        liquidity: null,
      });
      expect(result.breakdown[0].category).toBe("Intent");
    });

    it("liquidity breakdown uses 'Financial' category", () => {
      const result = calculateFormScore({
        interestLevel: "",
        liquidity: "OVER_500K",
      });
      expect(result.breakdown[0].category).toBe("Financial");
    });

    it("total equals the sum of all breakdown points", () => {
      const result = calculateFormScore({
        interestLevel: "SERIOUSLY_CONSIDERING",
        liquidity: "RANGE_250K_500K",
      });
      const sumOfBreakdown = result.breakdown.reduce(
        (sum, entry) => sum + entry.points,
        0
      );
      expect(result.total).toBe(sumOfBreakdown);
    });

    it("interest entry appears before liquidity entry in breakdown", () => {
      const result = calculateFormScore({
        interestLevel: "READY_TO_START",
        liquidity: "OVER_500K",
      });
      expect(result.breakdown[0].category).toBe("Intent");
      expect(result.breakdown[1].category).toBe("Financial");
    });
  });
});
