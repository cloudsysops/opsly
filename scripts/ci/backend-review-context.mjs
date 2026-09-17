const DEFAULT_MAX_REVIEW_CONTEXT_CHARS = 10_000;
const MIN_FILE_PATCH_CHARS = 700;
const MAX_FILE_PATCH_CHARS = 4_000;

function priorityForPath(filename) {
  if (filename.startsWith('.github/workflows/')) return 4;
  if (filename.startsWith('scripts/ci/') || filename.startsWith('scripts/deploy/')) return 4;
  if (filename.startsWith('infra/') || filename.includes('/migrations/')) return 3;
  if (filename.startsWith('docs/')) return 1;
  return 2;
}

function trimAtLineBoundaryFromEnd(text, maxChars) {
  if (text.length <= maxChars) return text;
  const candidate = text.slice(0, maxChars);
  const newline = candidate.lastIndexOf('\n');
  return newline > 0 ? candidate.slice(0, newline + 1) : candidate;
}

function trimAtLineBoundaryFromStart(text, maxChars) {
  if (text.length <= maxChars) return text;
  const start = Math.max(0, text.length - maxChars);
  const newline = text.indexOf('\n', start);
  return newline >= 0 && newline + 1 < text.length ? text.slice(newline + 1) : text.slice(start);
}

export function truncatePatchMiddle(patch, maxChars) {
  if (!patch || patch.length <= maxChars) return patch ?? '';
  const markerTemplate = (omitted) =>
    `\n[...${omitted} chars omitted from middle of this file patch; this marker is reviewer-context metadata, not repository code...]\n`;

  let marker = markerTemplate(patch.length - maxChars);
  const payloadBudget = Math.max(2, maxChars - marker.length);
  const headBudget = Math.ceil(payloadBudget / 2);
  const tailBudget = Math.floor(payloadBudget / 2);
  const head = trimAtLineBoundaryFromEnd(patch, headBudget);
  const tail = trimAtLineBoundaryFromStart(patch, tailBudget);
  const omitted = Math.max(0, patch.length - head.length - tail.length);
  marker = markerTemplate(omitted);
  return `${head}${marker}${tail}`;
}

function fileHeader(file) {
  const status = file.status ?? 'modified';
  const additions = Number(file.additions ?? 0);
  const deletions = Number(file.deletions ?? 0);
  return `\n===== FILE ${file.filename} | ${status} | +${additions}/-${deletions} =====\n`;
}

export function buildFileAwareReviewContext(
  files,
  { maxChars = DEFAULT_MAX_REVIEW_CONTEXT_CHARS } = {},
) {
  if (!Array.isArray(files) || files.length === 0) return '[No changed files returned by GitHub]';
  if (!Number.isFinite(maxChars) || maxChars < 1_000) {
    throw new Error('maxChars must be at least 1000');
  }

  const ordered = [...files].sort((a, b) => {
    const priorityDelta = priorityForPath(b.filename ?? '') - priorityForPath(a.filename ?? '');
    return priorityDelta || String(a.filename).localeCompare(String(b.filename));
  });

  const headers = ordered.map(fileHeader);
  const headerChars = headers.reduce((sum, header) => sum + header.length, 0);
  const metadataReserve = 180;
  let patchBudget = Math.max(0, maxChars - headerChars - metadataReserve);
  let weightRemaining = ordered.reduce((sum, file) => sum + priorityForPath(file.filename ?? ''), 0);
  const sections = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const file = ordered[index];
    const priority = priorityForPath(file.filename ?? '');
    const remainingFiles = ordered.length - index;
    const minimumForRest = Math.max(0, (remainingFiles - 1) * MIN_FILE_PATCH_CHARS);
    const weightedShare = weightRemaining > 0
      ? Math.floor((patchBudget * priority) / weightRemaining)
      : Math.floor(patchBudget / remainingFiles);
    const maxAvailableNow = Math.max(0, patchBudget - minimumForRest);
    const allocation = Math.min(
      MAX_FILE_PATCH_CHARS,
      maxAvailableNow,
      Math.max(MIN_FILE_PATCH_CHARS, weightedShare),
    );

    const rawPatch = typeof file.patch === 'string' && file.patch.length > 0
      ? file.patch
      : '[Patch unavailable from GitHub API; inspect the file directly before treating absence as a code defect.]';
    const renderedPatch = truncatePatchMiddle(rawPatch, Math.max(1, allocation));
    sections.push(`${headers[index]}${renderedPatch}`);
    patchBudget = Math.max(0, patchBudget - renderedPatch.length);
    weightRemaining -= priority;
  }

  let output = sections.join('\n');
  const footer = '\n\n[Reviewer context is file-aware and bounded. Middle-omission markers describe this prompt only; never report those markers themselves as PR defects.]';
  if (output.length + footer.length > maxChars) {
    output = trimAtLineBoundaryFromEnd(output, Math.max(1, maxChars - footer.length));
  }
  return `${output}${footer}`;
}

export { DEFAULT_MAX_REVIEW_CONTEXT_CHARS };
