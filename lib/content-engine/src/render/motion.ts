import type { SceneMotion } from '../domain/types.js';

/**
 * Builds an ffmpeg `zoompan` filter expression for a scene's motion style.
 * zoompan operates frame-by-frame over `frames` output frames at `fps`;
 * `z`/`x`/`y` are expressions re-evaluated each frame.
 */
export function buildMotionFilter(
  motion: SceneMotion,
  options: { width: number; height: number; fps: number; durationSec: number }
): string {
  const frames = Math.max(1, Math.round(options.durationSec * options.fps));
  const { width, height, fps } = options;
  const size = `${width}x${height}`;

  switch (motion) {
    case 'zoom-in':
      return (
        `zoompan=z='min(zoom+0.0012,1.4)':d=${frames}:` +
        `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${size}:fps=${fps}`
      );
    case 'zoom-out':
      return (
        `zoompan=z='if(eq(on,0),1.4,max(zoom-0.0012,1.0))':d=${frames}:` +
        `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${size}:fps=${fps}`
      );
    case 'pan-left':
      return (
        `zoompan=z='1.15':d=${frames}:` +
        `x='iw-(iw/zoom)-(iw-(iw/zoom))*on/${frames}':y='ih/2-(ih/zoom/2)':s=${size}:fps=${fps}`
      );
    case 'pan-right':
      return (
        `zoompan=z='1.15':d=${frames}:` +
        `x='(iw-(iw/zoom))*on/${frames}':y='ih/2-(ih/zoom/2)':s=${size}:fps=${fps}`
      );
    case 'static':
    default:
      return `zoompan=z='1.0':d=${frames}:x=0:y=0:s=${size}:fps=${fps}`;
  }
}
