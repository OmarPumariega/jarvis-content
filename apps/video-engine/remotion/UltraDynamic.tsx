import React from 'react';
import {
  AbsoluteFill,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { UltraDynamicPropsSchema, type UltraDynamicProps } from './types';

export { UltraDynamicPropsSchema };

function Caption({
  text,
  startFrame,
  endFrame,
  accentColor,
}: {
  text: string;
  startFrame: number;
  endFrame: number;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame || frame > endFrame) return null;

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 180 },
  });

  const opacity = interpolate(
    frame,
    [endFrame - 6, endFrame],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 160,
        left: '50%',
        transform: `translateX(-50%) scale(${progress})`,
        opacity,
        backgroundColor: 'rgba(0,0,0,0.75)',
        padding: '12px 24px',
        borderRadius: 8,
        borderLeft: `4px solid ${accentColor}`,
        maxWidth: '85%',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize: 38,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {text}
      </span>
    </div>
  );
}

export function UltraDynamic(props: UltraDynamicProps) {
  const parsed = UltraDynamicPropsSchema.parse(props);
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 200 },
  });

  const titleOpacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Video src={parsed.videoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Title overlay at the top */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: `translateX(-50%) scale(${titleScale})`,
          opacity: titleOpacity,
          backgroundColor: parsed.accentColor,
          padding: '10px 28px',
          borderRadius: 6,
          maxWidth: '88%',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 32,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
          }}
        >
          {parsed.title}
        </span>
      </div>

      {/* Captions */}
      {parsed.captions.map((c, i) => (
        <Caption
          key={i}
          text={c.text}
          startFrame={c.startFrame}
          endFrame={c.endFrame}
          accentColor={parsed.accentColor}
        />
      ))}
    </AbsoluteFill>
  );
}
