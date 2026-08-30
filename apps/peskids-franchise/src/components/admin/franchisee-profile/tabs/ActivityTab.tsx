"use client";

import React from "react";
import {
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  BellIcon,
  CurrencyDollarIcon,
  PencilIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { formatDate } from "@/lib/utils";

interface Activity {
  id: string;
  activityType: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  performedBy?: string | null;
  createdAt: string | Date;
}

interface ActivityTabProps {
  franchisee: {
    id: string;
    activities?: Activity[];
  };
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: typeof EnvelopeIcon; color: string; bgColor: string }
> = {
  EMAIL_SENT: { icon: EnvelopeIcon, color: "text-blue-600", bgColor: "bg-blue-100" },
  SMS_SENT: { icon: ChatBubbleLeftRightIcon, color: "text-purple-600", bgColor: "bg-purple-100" },
  SMS_RECEIVED: { icon: ChatBubbleLeftRightIcon, color: "text-purple-600", bgColor: "bg-purple-100" },
  CALL_LOGGED: { icon: PhoneIcon, color: "text-green-600", bgColor: "bg-green-100" },
  STAGE_CHANGED: { icon: ArrowRightIcon, color: "text-brand-navy", bgColor: "bg-brand-navy/10" },
  DOCUMENT_SIGNED: { icon: DocumentTextIcon, color: "text-amber-600", bgColor: "bg-amber-100" },
  DOCUMENT_DOWNLOADED: { icon: DocumentTextIcon, color: "text-gray-600", bgColor: "bg-gray-100" },
  NOTE_ADDED: { icon: PencilIcon, color: "text-gray-600", bgColor: "bg-gray-100" },
  SCORE_UPDATED: { icon: ArrowPathIcon, color: "text-orange-600", bgColor: "bg-orange-100" },
  WORKFLOW_TRIGGERED: { icon: BellIcon, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  PRE_WORK_STARTED: { icon: ClockIcon, color: "text-blue-600", bgColor: "bg-blue-100" },
  PRE_WORK_SUBMITTED: { icon: CheckCircleIcon, color: "text-green-600", bgColor: "bg-green-100" },
  LOGIN: { icon: ArrowRightIcon, color: "text-gray-600", bgColor: "bg-gray-100" },
  PAGE_VIEW: { icon: ArrowRightIcon, color: "text-gray-400", bgColor: "bg-gray-50" },
  FORM_SUBMITTED: { icon: DocumentTextIcon, color: "text-blue-600", bgColor: "bg-blue-100" },
};

export default function ActivityTab({ franchisee }: ActivityTabProps) {
  const activities = franchisee.activities || [];

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  const getActivityConfig = (type: string) => {
    return (
      ACTIVITY_CONFIG[type] || {
        icon: ClockIcon,
        color: "text-gray-600",
        bgColor: "bg-gray-100",
      }
    );
  };

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedActivities).length > 0 ? (
        Object.entries(groupedActivities).map(([date, dayActivities]) => (
          <div key={date} className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              {date}
            </h3>
            <div className="space-y-4">
              {dayActivities.map((activity, index) => {
                const config = getActivityConfig(activity.activityType);
                const Icon = config.icon;

                return (
                  <div key={activity.id} className="flex gap-4">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor}`}
                      >
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      {index < dayActivities.length - 1 && (
                        <div className="w-px h-full bg-gray-200 my-2" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {activity.description}
                          </p>
                          {activity.performedBy && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              by {activity.performedBy}
                            </p>
                          )}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                              {Object.entries(activity.metadata).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span>{" "}
                                  {typeof value === "string" ? value : JSON.stringify(value)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                          {formatTime(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No activity recorded yet.</p>
        </div>
      )}
    </div>
  );
}
