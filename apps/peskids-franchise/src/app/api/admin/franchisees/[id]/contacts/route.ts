import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContactType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/admin/franchisees/[id]/contacts - List contacts for a franchisee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get the franchisee account for this prospect
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            contacts: {
              orderBy: [
                { isPrimary: "desc" },
                { contactType: "asc" },
                { createdAt: "asc" },
              ],
            },
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    if (!prospect.franchiseeAccount) {
      return NextResponse.json(
        { error: "Franchisee account not found" },
        { status: 400 }
      );
    }

    return NextResponse.json({ contacts: prospect.franchiseeAccount.contacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST /api/admin/franchisees/[id]/contacts - Create a new contact
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const { contactType, firstName, lastName, email, phone, isPrimary } = body;

    // Validate required fields
    if (!contactType || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Contact type, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Validate contact type
    const validContactTypes = Object.values(ContactType);
    if (!validContactTypes.includes(contactType)) {
      return NextResponse.json(
        { error: `Invalid contact type. Must be one of: ${validContactTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Get the franchisee account
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: { franchiseeAccount: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    if (!prospect.franchiseeAccount) {
      return NextResponse.json(
        { error: "Franchisee account not found" },
        { status: 400 }
      );
    }

    // If this contact is being set as primary, unset any existing primary contacts of the same type
    if (isPrimary) {
      await db.franchiseeContact.updateMany({
        where: {
          franchiseeId: prospect.franchiseeAccount.id,
          contactType,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    // Create the contact
    const contact = await db.franchiseeContact.create({
      data: {
        franchiseeId: prospect.franchiseeAccount.id,
        contactType,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        isPrimary: isPrimary || false,
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "NOTE_ADDED",
        description: `Added ${contactType.replace("_", " ").toLowerCase()} contact: ${firstName} ${lastName}`,
        performedBy: session.user.email || undefined,
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
