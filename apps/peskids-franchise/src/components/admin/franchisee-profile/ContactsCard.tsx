"use client";

import React, { useState } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

const CONTACT_TYPES = [
  { value: "PRIMARY_OWNER", label: "Primary Owner" },
  { value: "SPOUSE_PARTNER", label: "Spouse/Partner" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "ACCOUNTING", label: "Accounting" },
  { value: "EMERGENCY", label: "Emergency" },
] as const;

type ContactType = (typeof CONTACT_TYPES)[number]["value"];

interface Contact {
  id: string;
  contactType: ContactType;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

interface ContactsCardProps {
  franchiseeId: string;
  contacts: Contact[];
  onAddContact?: (contact: Omit<Contact, "id">) => Promise<void>;
  onUpdateContact?: (contactId: string, contact: Partial<Contact>) => Promise<void>;
  onDeleteContact?: (contactId: string) => Promise<void>;
}

export default function ContactsCard({
  franchiseeId,
  contacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
}: ContactsCardProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [newContact, setNewContact] = useState({
    contactType: "PRIMARY_OWNER" as ContactType,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    isPrimary: false,
  });

  const [editContact, setEditContact] = useState<Partial<Contact>>({});
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const handleAddContact = async () => {
    if (!onAddContact || !newContact.firstName || !newContact.lastName) return;
    setIsLoading(true);
    try {
      await onAddContact(newContact);
      setIsAddingNew(false);
      setNewContact({
        contactType: "PRIMARY_OWNER",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        isPrimary: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateContact = async (contactId: string) => {
    if (!onUpdateContact) return;
    setIsLoading(true);
    try {
      await onUpdateContact(contactId, editContact);
      setEditingId(null);
      setEditContact({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContact = (contactId: string) => {
    if (!onDeleteContact) return;
    setDeleteContactId(contactId);
  };

  const doDeleteContact = async () => {
    if (!onDeleteContact || !deleteContactId) return;
    setDeleteContactId(null);
    setIsLoading(true);
    try {
      await onDeleteContact(deleteContactId);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (contact: Contact) => {
    setEditingId(contact.id);
    setEditContact({
      contactType: contact.contactType,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      isPrimary: contact.isPrimary,
    });
  };

  const getContactTypeLabel = (type: ContactType) => {
    return CONTACT_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Group contacts by type
  const contactsByType = CONTACT_TYPES.map((type) => ({
    ...type,
    contacts: contacts.filter((c) => c.contactType === type.value),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-gray-400" />
          Contacts
        </h3>
        {!isAddingNew && (
          <button
            onClick={() => setIsAddingNew(true)}
            className="inline-flex items-center gap-1 text-sm text-brand-navy hover:text-brand-navy/80"
          >
            <PlusIcon className="h-4 w-4" />
            Add Contact
          </button>
        )}
      </div>

      {/* Add new contact form */}
      {isAddingNew && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Contact</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact Type</label>
              <select
                value={newContact.contactType}
                onChange={(e) => setNewContact({ ...newContact, contactType: e.target.value as ContactType })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              >
                {CONTACT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="newIsPrimary"
                checked={newContact.isPrimary}
                onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                className="h-4 w-4 text-brand-navy border-gray-300 rounded focus:ring-brand-navy"
              />
              <label htmlFor="newIsPrimary" className="text-sm text-gray-700">
                Primary contact
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
              <input
                type="text"
                value={newContact.firstName}
                onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
              <input
                type="text"
                value={newContact.lastName}
                onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => setIsAddingNew(false)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddContact}
              disabled={isLoading || !newContact.firstName || !newContact.lastName}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add Contact"}
            </button>
          </div>
        </div>
      )}

      {/* Contact list by type */}
      <div className="space-y-4">
        {contactsByType.map((group) => {
          if (group.contacts.length === 0) return null;
          return (
            <div key={group.value}>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                {group.label}
              </h4>
              <div className="space-y-2">
                {group.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    {editingId === contact.id ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editContact.firstName || ""}
                          onChange={(e) => setEditContact({ ...editContact, firstName: e.target.value })}
                          placeholder="First Name"
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-brand-navy focus:border-brand-navy"
                        />
                        <input
                          type="text"
                          value={editContact.lastName || ""}
                          onChange={(e) => setEditContact({ ...editContact, lastName: e.target.value })}
                          placeholder="Last Name"
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-brand-navy focus:border-brand-navy"
                        />
                        <input
                          type="email"
                          value={editContact.email || ""}
                          onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                          placeholder="Email"
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-brand-navy focus:border-brand-navy"
                        />
                        <input
                          type="tel"
                          value={editContact.phone || ""}
                          onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })}
                          placeholder="Phone"
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-brand-navy focus:border-brand-navy"
                        />
                        <div className="sm:col-span-2 flex items-center justify-between">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editContact.isPrimary || false}
                              onChange={(e) => setEditContact({ ...editContact, isPrimary: e.target.checked })}
                              className="h-4 w-4 text-brand-navy border-gray-300 rounded focus:ring-brand-navy"
                            />
                            <span className="text-sm text-gray-700">Primary</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateContact(contact.id)}
                              disabled={isLoading}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                            {contact.isPrimary && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-brand-navy/10 text-brand-navy rounded">
                                Primary
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="flex items-center gap-1 hover:text-brand-navy"
                              >
                                <EnvelopeIcon className="h-3.5 w-3.5" />
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <a
                                href={`tel:${contact.phone}`}
                                className="flex items-center gap-1 hover:text-brand-navy"
                              >
                                <PhoneIcon className="h-3.5 w-3.5" />
                                {contact.phone}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(contact)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {contacts.length === 0 && !isAddingNew && (
          <p className="text-sm text-gray-500 text-center py-4">
            No contacts added yet.
          </p>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteContactId}
        title="Delete Contact"
        message="Are you sure you want to delete this contact?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={doDeleteContact}
        onCancel={() => setDeleteContactId(null)}
      />
    </div>
  );
}
