import type {
  EnrollmentAccessRecord,
  EnrollmentLeadMetadata,
  EnrollmentTimelineEntry,
  EnrollmentTimelineKind,
} from './types';

export function asLeadMetadata(value: unknown): EnrollmentLeadMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as EnrollmentLeadMetadata;
}

export function appendEnrollmentTimeline(
  metadata: EnrollmentLeadMetadata,
  kind: EnrollmentTimelineKind,
  at: string,
  requestId?: string
): EnrollmentLeadMetadata {
  const entry: EnrollmentTimelineEntry = requestId
    ? { at, kind, request_id: requestId }
    : { at, kind };
  const previous = metadata.enrollment_timeline ?? [];
  const already = previous.some((row) => row.kind === kind && row.at === at);
  if (already) {
    return metadata;
  }
  return {
    ...metadata,
    enrollment_timeline: [...previous, entry],
  };
}

export function withEnrollmentAccess(
  metadata: EnrollmentLeadMetadata,
  access: EnrollmentAccessRecord
): EnrollmentLeadMetadata {
  return { ...metadata, enrollment_access: access };
}
