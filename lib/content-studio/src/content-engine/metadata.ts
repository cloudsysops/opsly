import type { ContentMetadataExport, ContentProjectEnvelope } from './types.js';

export function buildContentMetadata(
  envelope: ContentProjectEnvelope
): ContentMetadataExport {
  const title = envelope.project.title;
  const description = [
    envelope.project.series,
    envelope.project.audience,
    envelope.project.goal,
    `Preset: ${envelope.project.preset}`,
  ].join(' · ');
  const tags = [
    envelope.project.channel,
    envelope.project.series,
    envelope.project.goal,
    envelope.project.format,
    envelope.project.tenantId,
  ];
  return {
    title,
    description,
    tags: [...new Set(tags.map((tag) => tag.toLowerCase().replace(/\s+/g, '-')))],
    privacyStatus: 'unlisted',
  };
}

