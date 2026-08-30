import type { ContentChannel } from '../domain/types.js';

export interface ChannelPreset {
  channel: ContentChannel;
  label: string;
  resolution: { width: number; height: number };
  aspectRatio: '9:16' | '1:1' | '16:9';
  fps: number;
  defaultDurationMs: number;
  sceneDurationLimits: { minMs: number; maxMs: number };
  font: {
    family: string;
    size: number;
    weight: 'normal' | 'bold';
  };
  subtitleStyle: {
    fontSize: number;
    primaryColor: string;
    outlineColor: string;
    outlineWidth: number;
    marginVerticalPx: number;
  };
  /** Fraction of frame height/width reserved on each edge, away from platform UI chrome. */
  safeArea: { topPct: number; bottomPct: number; leftPct: number; rightPct: number };
  transitionStyle: 'cut' | 'fade' | 'dissolve';
  musicLevelDb: number;
  voiceLevelDb: number;
  brandColors: { primary: string; secondary: string; accent: string };
  logo?: string;
  intro?: { durationMs: number; text?: string };
  outro?: { durationMs: number; text?: string };
  ctaStyle: string;
}
