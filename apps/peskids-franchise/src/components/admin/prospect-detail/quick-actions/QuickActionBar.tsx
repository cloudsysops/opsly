"use client";

import { useState } from "react";
import { LogCallModal } from "./LogCallModal";
import { LogMeetingModal } from "./LogMeetingModal";
import { CreateTaskModal } from "./CreateTaskModal";
import { AddNoteModal } from "./AddNoteModal";
import { SendEmailModal } from "./SendEmailModal";

interface QuickActionBarProps {
  prospectId: string;
  prospectEmail: string;
  prospectName: string;
  prospectPhone: string | null;
  hasPortalAccess: boolean;
  inviteSentAt: Date | null;
}

export function QuickActionBar({ prospectId, prospectEmail, prospectName, prospectPhone, hasPortalAccess, inviteSentAt }: QuickActionBarProps) {
  const [showCallModal, setShowCallModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSendInvite() {
    setIsSendingInvite(true);
    setInviteStatus("idle");

    try {
      const res = await fetch(`/api/admin/prospects/${prospectId}/invite`, {
        method: "POST",
      });

      if (res.ok) {
        setInviteStatus("success");
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        setInviteStatus("error");
      }
    } catch {
      setInviteStatus("error");
    } finally {
      setIsSendingInvite(false);
    }
  }

  const actions = [
    {
      label: "Log Call",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      onClick: () => setShowCallModal(true),
      color: "bg-brand-green hover:bg-brand-green/80",
    },
    {
      label: "Schedule Meeting",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => setShowMeetingModal(true),
      color: "bg-brand-orange hover:bg-brand-orange/80",
    },
    {
      label: "Create Task",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      onClick: () => setShowTaskModal(true),
      color: "bg-brand-yellow hover:bg-brand-yellow/80",
    },
    {
      label: "Add Note",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => setShowNoteModal(true),
      color: "bg-brand-purple hover:bg-brand-purple/80",
    },
    {
      label: "Send Email",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => setShowEmailModal(true),
      color: "bg-brand-cyan hover:bg-brand-cyan/80",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        {/* Portal Access Status & Invite Button */}
        {hasPortalAccess ? (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Portal Access Granted
          </span>
        ) : inviteSentAt ? (
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Invite Sent {new Date(inviteSentAt).toLocaleDateString()}
          </span>
        ) : (
          <button
            onClick={handleSendInvite}
            disabled={isSendingInvite}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              isSendingInvite ? "bg-brand-navy/50 cursor-not-allowed" : "bg-brand-navy hover:bg-brand-navy/80"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {isSendingInvite ? "Sending..." : "Send Portal Invite"}
          </button>
        )}

        {inviteStatus === "success" && (
          <span className="text-sm text-green-600">Invite sent!</span>
        )}
        {inviteStatus === "error" && (
          <span className="text-sm text-red-600">Failed to send invite</span>
        )}

        <div className="w-px h-6 bg-gray-300 mx-2 hidden sm:block" />

        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors ${action.color}`}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Modals */}
      {showCallModal && (
        <LogCallModal
          prospectId={prospectId}
          prospectName={prospectName}
          onClose={() => setShowCallModal(false)}
        />
      )}
      {showMeetingModal && (
        <LogMeetingModal
          prospectId={prospectId}
          prospectName={prospectName}
          prospectEmail={prospectEmail}
          onClose={() => setShowMeetingModal(false)}
        />
      )}
      {showTaskModal && (
        <CreateTaskModal
          prospectId={prospectId}
          prospectName={prospectName}
          onClose={() => setShowTaskModal(false)}
        />
      )}
      {showNoteModal && (
        <AddNoteModal
          prospectId={prospectId}
          onClose={() => setShowNoteModal(false)}
        />
      )}
      {showEmailModal && (
        <SendEmailModal
          prospectId={prospectId}
          prospectName={prospectName}
          prospectEmail={prospectEmail}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </>
  );
}
