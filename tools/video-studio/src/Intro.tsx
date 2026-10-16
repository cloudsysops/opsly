import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Corners, NeonBackground } from './Frame';
import { theme } from './theme';

export type IntroProps = { title: string; subtitle: string };

// Intro 16:9 (1920x1080, 5 s): marca entrando con resorte, línea de luz y subtítulo.
export const Intro: React.FC<IntroProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const line = interpolate(frame, [15, 45], [0, 1], { extrapolateRight: 'clamp' });
  const sub = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: 'clamp' });
  const out = interpolate(frame, [125, 149], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <NeonBackground>
      <Corners />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out }}>
        <div style={{ fontFamily: theme.display, fontSize: 190, letterSpacing: 10, transform: `scale(${0.7 + pop * 0.3})`, opacity: pop, textShadow: `6px 6px 0 #000b, 0 0 40px ${theme.cyan}88` }}>{title}</div>
        <div style={{ width: 900 * line, height: 3, margin: '34px 0', background: `linear-gradient(90deg, transparent, ${theme.cyan}, ${theme.magenta}, transparent)` }} />
        <div style={{ fontSize: 52, letterSpacing: 14, color: theme.muted, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>{subtitle}</div>
      </AbsoluteFill>
    </NeonBackground>
  );
};
