export function isMissingExpandedFeedbackColumn(
  error: { message?: string } | null | undefined
): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('author_type') ||
    message.includes('author_ref_id') ||
    message.includes('subject_type') ||
    message.includes('subject_ref_id') ||
    message.includes('rating') ||
    message.includes('ai_summary') ||
    message.includes('body') ||
    message.includes('status') ||
    message.includes('visibility') ||
    message.includes('audience')
  );
}
