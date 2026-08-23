import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContactType } from "@prisma/client";

export const dynamic = "force-dynamic";

// PATCH /api/admin/franchisees/[id]/contacts/[contactId] - Update a contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, contactId } = params;
    const body = await request.json();

    const { contactType, firstName, lastName, email, phone, isPrimary } = body;

    // Get the franchisee account to verify ownership
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: { franchiseeAccount: true },
    });

    if (!prospect || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    // Verify the contact belongs to this franchisee
    const existingContact = await db.franchiseeContact.findUnique({
      where: { id: contactId },
    });

    if (!existingContact || existingContact.franchiseeId !== prospect.franchiseeAccount.id) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Validate contact type if provided
    if (contactType) {
      const validContactTypes = Object.values(ContactType);
      if (!validContactTypes.includes(contactType)) {
        return NextResponse.json(
          { error: `Invalid contact type. Must be one of: ${validContactTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // If this contact is being set as primary, unset any existing primary contacts of the same type
    const finalContactType = contactType || existingContact.contactType;
    if (isPrimary) {
      await db.franchiseeContact.updateMany({
        where: {
          franchiseeId: prospect.franchiseeAccount.id,
          contactType: finalContactType,
          isPrimary: true,
          id: { not: contactId },
        },
        data: { isPrimary: false },
      });
    }

    // Update the contact
    const contact = await db.franchiseeContact.update({
      where: { id: contactId },
      data: {
        ...(contactType !== undefined && { contactType }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(isPrimary !== undefined && { isPrimary }),
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "NOTE_ADDED",
        description: `Updated contact: ${contact.firstName} ${contact.lastName}`,
        performedBy: session.user.email || undefined,
      },
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/franchisees/[id]/contacts/[contactId] - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, contactId } = params;

    // Get the franchisee account to verify ownership
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: { franchiseeAccount: true },
    });

    if (!prospect || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    // Verify the contact belongs to this franchisee
    const existingContact = await db.franchiseeContact.findUnique({
      where: { id: contactId },
    });

    if (!existingContact || existingContact.franchiseeId !== prospect.franchiseeAccount.id) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Delete the contact
    await db.franchiseeContact.delete({
      where: { id: contactId },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "NOTE_ADDED",
        description: `Deleted contact: ${existingContact.firstName} ${existingContact.lastName}`,
        performedBy: session.user.email || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
