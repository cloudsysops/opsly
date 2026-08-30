"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import { ProspectActions } from "@/components/admin/ProspectActions";
import { AddNoteForm } from "@/components/admin/AddNoteForm";
import { VisitorTimeline } from "@/components/admin/VisitorTimeline";

const interestLabels: Record<string, string> = {
  READY_TO_START: "Ready to Start",
  ACTIVELY_SEEKING_FUNDING: "Seeking Funding",
  SERIOUSLY_CONSIDERING: "Seriously Considering",
  JUST_EXPLORING: "Just Exploring",
  GATHERING_INFORMATION: "Gathering Info",
};

const liquidityLabels: Record<string, string> = {
  UNDER_50K: "Under $50,000",
  RANGE_50K_100K: "$50,000 - $100,000",
  RANGE_100K_250K: "$100,000 - $250,000",
  RANGE_250K_500K: "$250,000 - $500,000",
  OVER_500K: "Over $500,000",
};

const documentTypeLabels: Record<string, string> = {
  FDD_RECEIPT: "FDD Receipt",
  FRANCHISE_AGREEMENT: "Franchise Agreement",
  TERRITORY_AGREEMENT: "Territory Agreement",
  NDA: "Non-Disclosure Agreement",
  PRE_WORK_TERMS: "Pre-Work Terms",
};

const signatureStatusColors: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  SENT: "bg-amber-100 text-amber-700",
  VIEWED: "bg-blue-100 text-blue-700",
  SIGNED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-slate-100 text-slate-500",
  ERROR: "bg-red-100 text-red-700",
};

const signatureStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  SENT: "Sent",
  VIEWED: "Viewed",
  SIGNED: "Signed",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  ERROR: "Error",
};

interface OverviewTabProps {
  prospect: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    preferredTerritory: string | null;
    interestLevel: string;
    liquidity: string | null;
    aboutYourself: string | null;
    referralSource: string | null;
    pipelineStage: string;
    prospectScore: number;
    assignedTo: string | null;
    createdAt: Date;
    lastContactAt: Date | null;
    utmSource: string | null;
    utmCampaign: string | null;
    preWorkSubmissions: Array<{
      id: string;
      status: string;
      submittedAt: Date | null;
      score: number | null;
      module: { title: string };
    }>;
    documents: Array<{
      id: string;
      documentType: string;
      signatureStatus: string;
      acknowledgedAt: Date | null;
      sentAt: Date | null;
      signedAt: Date | null;
      viewedAt: Date | null;
      expiresAt: Date | null;
    }>;
    conversations: Array<{
      id: string;
      updatedAt: Date;
      messages: Array<{
        id: string;
        role: string;
        content: string;
      }>;
    }>;
    visitors: Array<{
      sessions: Array<{
        startedAt: Date;
        pageViews: Array<{
          pagePath: string;
          enteredAt: Date;
        }>;
      }>;
    }>;
    notes: Array<{
      id: string;
      content: string;
      authorEmail: string;
      isPinned: boolean;
      createdAt: Date;
    }>;
  };
}

export function OverviewTab({ prospect }: OverviewTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 grid-cols-1">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Contact Information
            </h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="font-medium">{prospect.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Preferred Territory</dt>
                <dd className="font-medium">
                  {prospect.preferredTerritory || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Interest Level</dt>
                <dd className="font-medium text-sm">
                  {interestLabels[prospect.interestLevel]}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Available Liquidity</dt>
                <dd className="font-medium text-sm">
                  {prospect.liquidity
                    ? liquidityLabels[prospect.liquidity]
                    : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-gray-500">About Themselves</dt>
                <dd className="font-medium whitespace-pre-wrap text-sm">
                  {prospect.aboutYourself || "—"}
                </dd>
              </div>
              {prospect.referralSource && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-gray-500">Referral Source</dt>
                  <dd className="font-medium">{prospect.referralSource}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Pre-Work Progress */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Pre-Work Progress
            </h2>
          </CardHeader>
          <CardContent>
            {prospect.preWorkSubmissions.length > 0 ? (
              <div className="space-y-4">
                {prospect.preWorkSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {submission.module.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.submittedAt
                          ? `Submitted ${formatDate(submission.submittedAt)}`
                          : "In progress"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          submission.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : submission.status === "SUBMITTED"
                            ? "bg-yellow-100 text-yellow-700"
                            : submission.status === "NEEDS_REVISION"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {submission.status}
                      </span>
                      {submission.score && (
                        <div className="mt-1 text-sm font-medium">
                          Score: {submission.score}/10
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pre-work submissions yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Chat History */}
        {prospect.conversations.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">
                Earl Conversations
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prospect.conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/admin/conversations/${conversation.id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-sm text-gray-500 mb-2">
                      {formatDate(conversation.updatedAt)} • {conversation.messages.length} messages
                    </div>
                    {conversation.messages.slice(0, 2).map((message) => (
                      <div
                        key={message.id}
                        className={`text-sm ${
                          message.role === "USER"
                            ? "text-brand-navy"
                            : "text-gray-600"
                        }`}
                      >
                        <span className="font-medium">
                          {message.role === "USER" ? "Prospect:" : "Earl:"}
                        </span>{" "}
                        {message.content.slice(0, 100)}
                        {message.content.length > 100 && "..."}
                      </div>
                    ))}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visitor Timeline */}
        {prospect.visitors.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-brand-navy">
                Visitor Journey
              </h2>
            </CardHeader>
            <CardContent>
              <VisitorTimeline visitors={prospect.visitors as never} />
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Documents
            </h2>
          </CardHeader>
          <CardContent>
            {prospect.documents.length > 0 ? (
              <div className="space-y-3">
                {prospect.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {documentTypeLabels[doc.documentType] || doc.documentType}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {doc.signedAt
                          ? `Signed ${formatDate(doc.signedAt)}`
                          : doc.sentAt
                          ? `Sent ${formatDate(doc.sentAt)}`
                          : doc.acknowledgedAt
                          ? `Acknowledged ${formatDate(doc.acknowledgedAt)}`
                          : "Not started"}
                      </div>
                      {doc.viewedAt && doc.signatureStatus !== "SIGNED" && (
                        <div className="text-xs text-blue-600 mt-0.5">
                          Viewed {formatDate(doc.viewedAt)}
                        </div>
                      )}
                      {doc.expiresAt && doc.signatureStatus !== "SIGNED" && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Expires {formatDate(doc.expiresAt)}
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        signatureStatusColors[doc.signatureStatus] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {signatureStatusLabels[doc.signatureStatus] || doc.signatureStatus}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No documents yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Actions
            </h2>
          </CardHeader>
          <CardContent>
            <ProspectActions
              prospectId={prospect.id}
              currentStage={prospect.pipelineStage}
              currentScore={prospect.prospectScore}
              assignedTo={prospect.assignedTo}
              prospectName={`${prospect.firstName} ${prospect.lastName}`}
              prospectEmail={prospect.email}
            />
          </CardContent>
        </Card>

        {/* Quick Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Quick Info
            </h2>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="font-medium">{formatDate(prospect.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Last Contact</dt>
                <dd className="font-medium">
                  {prospect.lastContactAt
                    ? formatDate(prospect.lastContactAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Assigned To</dt>
                <dd className="font-medium">{prospect.assignedTo || "Unassigned"}</dd>
              </div>
              {prospect.utmSource && (
                <div>
                  <dt className="text-sm text-gray-500">Source</dt>
                  <dd className="font-medium">
                    {prospect.utmSource}
                    {prospect.utmCampaign && ` / ${prospect.utmCampaign}`}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Notes</h2>
          </CardHeader>
          <CardContent>
            <AddNoteForm prospectId={prospect.id} />

            {prospect.notes.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-4">
                {prospect.notes.map((note) => (
                  <div key={note.id} className={`p-3 rounded-lg ${note.isPinned ? 'bg-brand-light border border-brand-cyan/20' : 'bg-gray-50'}`}>
                    {note.isPinned && (
                      <span className="inline-block text-xs font-medium text-brand-cyan mb-1">Pinned</span>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {note.authorEmail} • {formatDate(note.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
