import React from 'react';
import { Composition } from 'remotion';
import { ClipVertical } from './ClipVertical';
import { Intro } from './Intro';

export const Root: React.FC = () => (
  <>
    <Composition id="Intro" component={Intro} durationInFrames={150} fps={30} width={1920} height={1080} defaultProps={{ title: 'OPS AFTER DARK', subtitle: 'LIVE · VIBE CODING · BATTLEFIELD 6' }} />
    <Composition id="ClipVertical" component={ClipVertical} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={{ video: '', title: 'TÍTULO DEL CLIP', hashtags: '#twitch #vibecoding #bf6', startSec: 0 }} />
  </>
);
