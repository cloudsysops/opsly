import type { MissionControlNavItem, MissionControlNavSection } from './types.js';

export function flattenNavItems(sections: MissionControlNavSection[]): MissionControlNavItem[] {
  return sections.flatMap((s) => s.items);
}

export function isNavActive(
  pathname: string,
  href: string,
  basePath: string,
  legacyHref?: string
): boolean {
  if (href === basePath || href === `${basePath}/`) {
    return pathname === basePath || pathname === `${basePath}/` || pathname === '/';
  }
  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }
  if (legacyHref) {
    return pathname === legacyHref || pathname.startsWith(`${legacyHref}/`);
  }
  return false;
}

export function assertNoForbiddenNavPaths(
  sections: MissionControlNavSection[],
  forbiddenSubstrings: string[]
): void {
  const hrefs = flattenNavItems(sections)
    .map((i) => i.href)
    .join(' ');
  for (const bad of forbiddenSubstrings) {
    if (hrefs.toLowerCase().includes(bad.toLowerCase())) {
      throw new Error(`Mission Control nav contains forbidden path fragment: ${bad}`);
    }
  }
}
