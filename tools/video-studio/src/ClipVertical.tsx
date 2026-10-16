import React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Corners, NeonBackground } from './Frame';
import { theme } from './theme';

export type ClipProps = {
  /** Archivo dentro de public/ (p. ej. "clip.mp4"). Vacío = marcador de posición sin video. */
  video: string;
  title: string;
  hashtags: string;
  /** Segundo del video donde empieza el clip. */
  startSec: number;
};

// Clip vertical 9:16 (1080x1920) para TikTok / Reels / Shorts:
// video 16:9 centrado, título arriba, hashtags y @canal abajo.
export const ClipVertical: React.FC<ClipProps> = ({ video, title, hashtags, startSec }) => {
  const frame = useCurrentFrame();
  const titleIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <NeonBackground>
      <Corners inset={30} size={110} />
      <AbsoluteFill style={{ justifyContent: 'center' }}>
        <div style={{ height: 608, border: `2px solid ${theme.cyan}`, boxShadow: `0 0 40px ${theme.cyan}66`, background: '#000', overflow: 'hidden' }}>
          {video ? (
            <OffthreadVideo src={staticFile(video)} startFrom={Math.round(startSec * 30)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ color: theme.muted, fontSize: 36, textAlign: 'center', paddingTop: 270 }}>[ aquí va el video ]</div>
          )}
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 210, left: 60, right: 60, textAlign: 'center', opacity: titleIn, transform: `translateY(${(1 - titleIn) * -30}px)` }}>
        <div style={{ fontFamily: theme.display, fontSize: 92, lineHeight: 1.05, letterSpacing: 3, textShadow: `4px 4px 0 #000b, 0 0 30px ${theme.magenta}88` }}>{title}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 230, left: 60, right: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 44, color: theme.green, letterSpacing: 4 }}>{hashtags}</div>
        <div style={{ marginTop: 22, fontFamily: theme.display, fontSize: 60, letterSpacing: 6, color: theme.cyan }}>{theme.handle}</div>
      </div>
    </NeonBackground>
  );
};
