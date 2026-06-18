import React from 'react';
import {
  AbsoluteFill,
  Video,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { CorporatePropsSchema, type CorporateProps } from './types';

export { CorporatePropsSchema };

export function Corporate(props: CorporateProps) {
  const parsed = CorporatePropsSchema.parse(props);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const headerSlide = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 160 } }),
    [0, 1],
    [-120, 0],
  );

  const footerSlide = interpolate(
    spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 20, stiffness: 160 } }),
    [0, 1],
    [120, 0],
  );

  const globalOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#0d0d0d', opacity: globalOpacity }}>
      {/* Video fills the frame */}
      <Video src={parsed.videoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Semi-transparent gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Header bar */}
      <div
        style={{
          position: 'absolute',
          top: headerSlide,
          left: 0,
          right: 0,
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {parsed.logoSrc && (
          <Img src={parsed.logoSrc} style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        )}
        <div
          style={{
            width: 4,
            height: 36,
            backgroundColor: parsed.primaryColor,
            borderRadius: 2,
          }}
        />
        <span
          style={{
            color: '#fff',
            fontSize: 28,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          {parsed.title}
        </span>
      </div>

      {/* Footer */}
      {parsed.subtitle && (
        <div
          style={{
            position: 'absolute',
            bottom: footerSlide,
            left: 0,
            right: 0,
            padding: '20px 32px',
          }}
        >
          <div
            style={{
              backgroundColor: parsed.primaryColor,
              display: 'inline-block',
              padding: '8px 20px',
              borderRadius: 4,
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 24,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
              }}
            >
              {parsed.subtitle}
            </span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
