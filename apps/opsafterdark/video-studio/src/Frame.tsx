import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { theme } from './theme';

// Fondo con cuadrícula en movimiento, reutilizable.
export const NeonBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const pan = (frame * 1.2) % 80;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.body, color: theme.text }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 20%, ${theme.cyan}33, transparent 55%), radial-gradient(ellipse at 80% 90%, ${theme.magenta}22, transparent 50%)` }} />
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${theme.cyan}14 1px, transparent 1px), linear-gradient(90deg, ${theme.cyan}14 1px, transparent 1px)`, backgroundSize: '80px 80px', transform: `translate(${pan}px, ${pan}px)` }} />
      {children}
    </AbsoluteFill>
  );
};

// Esquinas neón con brillo que respira.
export const Corners: React.FC<{ inset?: number; size?: number }> = ({ inset = 40, size = 150 }) => {
  const frame = useCurrentFrame();
  const glow = interpolate(Math.sin(frame / 10), [-1, 1], [8, 26]);
  const corner = (pos: React.CSSProperties, color: string, borders: React.CSSProperties) => (
    <div style={{ position: 'absolute', width: size, height: size, filter: `drop-shadow(0 0 ${glow}px ${color})`, borderColor: color, borderStyle: 'solid', borderWidth: 0, ...borders, ...pos }} />
  );
  return (
    <AbsoluteFill>
      {corner({ left: inset, top: inset }, theme.cyan, { borderLeftWidth: 6, borderTopWidth: 6 })}
      {corner({ right: inset, top: inset }, theme.green, { borderRightWidth: 6, borderTopWidth: 6 })}
      {corner({ left: inset, bottom: inset }, theme.magenta, { borderLeftWidth: 6, borderBottomWidth: 6 })}
      {corner({ right: inset, bottom: inset }, theme.cyan, { borderRightWidth: 6, borderBottomWidth: 6 })}
    </AbsoluteFill>
  );
};
