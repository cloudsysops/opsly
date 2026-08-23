/**
 * Insert a wiki link at the first occurrence of `matchedText` in HTML content.
 * Returns the modified HTML, or null if no valid insertion point found.
 */
export function insertWikiLink(
  html: string,
  matchedText: string,
  targetId: string,
  targetSlug: string,
  targetTitle: string
): string | null {
  if (!matchedText || !html) return null;

  // Escape special regex characters in the matched text
  const escaped = matchedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Walk through the HTML, track whether we're inside an anchor,
  // and replace only the first occurrence that's outside one.
  let result = "";
  let i = 0;
  let inserted = false;

  while (i < html.length) {
    // Check for opening <a tag
    if (html.substring(i).match(/^<a[\s>]/i)) {
      // Find the closing </a>
      const closeIdx = html.indexOf("</a>", i);
      if (closeIdx !== -1) {
        const end = closeIdx + 4;
        result += html.substring(i, end);
        i = end;
        continue;
      }
    }

    // Check for any HTML tag (skip over it)
    if (html[i] === "<") {
      const tagEnd = html.indexOf(">", i);
      if (tagEnd !== -1) {
        result += html.substring(i, tagEnd + 1);
        i = tagEnd + 1;
        continue;
      }
    }

    // We're in text content — try to match
    if (!inserted) {
      const remaining = html.substring(i);
      // Extract text-only portion (up to next tag)
      const nextTag = remaining.indexOf("<");
      const textPortion = nextTag === -1 ? remaining : remaining.substring(0, nextTag);

      const matchRegex = new RegExp(escaped, "i");
      const match = matchRegex.exec(textPortion);

      if (match) {
        // Found a match in plain text outside of links
        const beforeMatch = textPortion.substring(0, match.index);
        const afterMatch = textPortion.substring(match.index + match[0].length);
        const wikiLink = `<a href="/wiki/${targetSlug}" class="wiki-link" data-wiki-id="${targetId}" title="${targetTitle}">${match[0]}</a>`;
        result += beforeMatch + wikiLink + afterMatch;
        // Add the rest after this text portion
        if (nextTag !== -1) {
          i += nextTag;
        } else {
          i = html.length;
        }
        inserted = true;
        continue;
      }
    }

    // No match in this segment, copy text up to next tag
    const remaining = html.substring(i);
    const nextTag = remaining.indexOf("<");
    if (nextTag === -1) {
      result += remaining;
      break;
    } else if (nextTag === 0) {
      result += html[i];
      i++;
    } else {
      result += remaining.substring(0, nextTag);
      i += nextTag;
    }
  }

  return inserted ? result : null;
}
