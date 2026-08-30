import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/franchisee/compliance/upload - Upload compliance document (metadata only for now)
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
    const { certificationId, documentUrl, expiresAt, notes } = body;

    if (!certificationId) {
      return NextResponse.json({ error: 'certificationId is required' }, { status: 400 });
    }

    // Verify the certification exists
    const certification = await db.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
    }

    // Calculate expiration date if certification has renewal period
    let calculatedExpiresAt = expiresAt ? new Date(expiresAt) : null;
    if (!calculatedExpiresAt && certification.renewalMonths) {
      calculatedExpiresAt = new Date();
      calculatedExpiresAt.setMonth(calculatedExpiresAt.getMonth() + certification.renewalMonths);
    }

    // Check if franchisee already has this certification
    const existing = await db.franchiseeCertification.findFirst({
      where: {
        franchiseeAccountId: prospect.franchiseeAccount.id,
        certificationId,
      },
    });

    if (existing) {
      // Update existing certification
      const updated = await db.franchiseeCertification.update({
        where: { id: existing.id },
        data: {
          documentUrl: documentUrl || existing.documentUrl,
          expiresAt: calculatedExpiresAt,
          status: 'ACTIVE',
          earnedAt: new Date(), // Reset earned date on renewal
        },
        include: { certification: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Certification updated successfully',
        certification: {
          id: updated.id,
          name: updated.certification.name,
          status: updated.status,
          earnedAt: updated.earnedAt.toISOString(),
          expiresAt: updated.expiresAt?.toISOString() || null,
        },
      });
    }

    // Create new certification record
    const created = await db.franchiseeCertification.create({
      data: {
        franchiseeAccountId: prospect.franchiseeAccount.id,
        certificationId,
        earnedAt: new Date(),
        expiresAt: calculatedExpiresAt,
        status: 'ACTIVE',
        documentUrl: documentUrl || null,
      },
      include: { certification: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Certification added successfully',
      certification: {
        id: created.id,
        name: created.certification.name,
        status: created.status,
        earnedAt: created.earnedAt.toISOString(),
        expiresAt: created.expiresAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error uploading compliance document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
