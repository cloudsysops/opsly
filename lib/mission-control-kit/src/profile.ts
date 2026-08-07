import { z } from 'zod';
import type { MissionControlProfile } from './types.js';

const brandSchema = z.object({
  productName: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string().optional(),
  colors: z.object({
    background: z.string(),
    surface: z.string(),
    primary: z.string(),
    accent: z.string(),
    success: z.string(),
    warning: z.string(),
    critical: z.string(),
    text: z.string(),
    muted: z.string(),
  }),
});

const navItemSchema = z.object({
  href: z.string().min(1),
  label: z.string().min(1),
  legacyHref: z.string().optional(),
});

const navSectionSchema = z.object({
  title: z.string().min(1),
  items: z.array(navItemSchema).min(1),
});

const featuresSchema = z.object({
  pipeline: z.boolean(),
  catalog: z.boolean(),
  modules: z.boolean(),
  integrations: z.boolean(),
  usage: z.boolean(),
  command: z.boolean(),
});

export const missionControlProfileSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(['platform', 'agency', 'tenant']),
  tenantSlug: z.string().min(1),
  brand: brandSchema,
  basePath: z.string().min(1),
  nav: z.array(navSectionSchema).min(1),
  features: featuresSchema,
  publicPanelUrl: z.string().url().nullable().optional(),
  docsPath: z.string().nullable().optional(),
  dataBoundaries: z.array(z.string()).default([]),
});

export type MissionControlProfileInput = z.input<typeof missionControlProfileSchema>;

export function parseMissionControlProfile(raw: unknown): MissionControlProfile {
  return missionControlProfileSchema.parse(raw) as MissionControlProfile;
}

export function safeParseMissionControlProfile(
  raw: unknown
): { ok: true; profile: MissionControlProfile } | { ok: false; error: string } {
  const result = missionControlProfileSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, profile: result.data as MissionControlProfile };
}
