import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Calculate score for a single response based on item type.
 * PASS_FAIL: PASS=1.0, FAIL=0.0
 * RATING_1_5: value/5
 * YES_NO: YES=1.0, NO=0.0
 * TEXT and PHOTO: not scored (weight 0)
 */
function calculateResponseScore(
  itemType: string,
  value: string
): number | null {
  switch (itemType) {
    case 'PASS_FAIL':
      return value.toUpperCase() === 'PASS' ? 1.0 : 0.0;
    case 'RATING_1_5': {
      const num = parseFloat(value);
      if (isNaN(num) || num < 1 || num > 5) return null;
      return num / 5;
    }
    case 'YES_NO':
      return value.toUpperCase() === 'YES' ? 1.0 : 0.0;
    case 'TEXT':
    case 'PHOTO':
      return null; // Not scored
    default:
      return null;
  }
}

// POST /api/admin/operations/audits/[id]/responses - Submit all responses
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { responses } = body;

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json(
        { error: 'Responses array is required' },
        { status: 400 }
      );
    }

    // Verify audit exists
    const audit = await db.fieldAudit.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Build a map of items by ID for score calculation
    const itemMap = new Map(
      audit.template.items.map((item) => [item.id, item])
    );

    // Validate all itemIds exist in this template
    for (const response of responses) {
      if (!itemMap.has(response.itemId)) {
        return NextResponse.json(
          {
            error: `Item ID ${response.itemId} does not belong to this audit's template`,
          },
          { status: 400 }
        );
      }
    }

    // Upsert each response and calculate scores
    const upsertedResponses = [];
    for (const response of responses) {
      const item = itemMap.get(response.itemId)!;
      const score = calculateResponseScore(item.itemType, response.value);

      const upserted = await db.auditResponse.upsert({
        where: {
          auditId_itemId: {
            auditId: id,
            itemId: response.itemId,
          },
        },
        create: {
          auditId: id,
          itemId: response.itemId,
          value: response.value,
          score,
          notes: response.notes || null,
          photoUrl: response.photoUrl || null,
        },
        update: {
          value: response.value,
          score,
          notes: response.notes || null,
          photoUrl: response.photoUrl || null,
        },
      });
      upsertedResponses.push(upserted);
    }

    // Calculate overall score:
    // Sum(response.score * item.weight) / Sum(item.weight for scored items) * 100
    const allResponses = await db.auditResponse.findMany({
      where: { auditId: id },
      include: { item: true },
    });

    let weightedScoreSum = 0;
    let totalWeight = 0;

    for (const r of allResponses) {
      // Only include scored items (TEXT and PHOTO have weight 0 or null score)
      if (r.score !== null && r.item.weight > 0) {
        weightedScoreSum += r.score * r.item.weight;
        totalWeight += r.item.weight;
      }
    }

    const overallScore =
      totalWeight > 0 ? (weightedScoreSum / totalWeight) * 100 : null;

    // Update audit overall score
    await db.fieldAudit.update({
      where: { id },
      data: {
        overallScore:
          overallScore !== null
            ? Math.round(overallScore * 10) / 10
            : null,
      },
    });

    // Check if all required items have responses
    const requiredItems = audit.template.items.filter(
      (item) => item.isRequired
    );
    const respondedItemIds = new Set(allResponses.map((r) => r.itemId));
    const allRequiredAnswered = requiredItems.every((item) =>
      respondedItemIds.has(item.id)
    );

    return NextResponse.json({
      overallScore:
        overallScore !== null
          ? Math.round(overallScore * 10) / 10
          : null,
      responsesSubmitted: upsertedResponses.length,
      totalResponses: allResponses.length,
      allRequiredAnswered,
      canComplete: allRequiredAnswered,
    });
  } catch (error) {
    console.error('Error submitting audit responses:', error);
    return NextResponse.json(
      { error: 'Failed to submit responses' },
      { status: 500 }
    );
  }
}
