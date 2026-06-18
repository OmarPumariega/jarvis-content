import React from 'react';
import {
  AbsoluteFill,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { HybridTutorialPropsSchema, type HybridTutorialProps } from './types';

export { HybridTutorialPropsSchema };

function StepIndicator({
  steps,
  frame,
  primaryColor,
}: {
  steps: HybridTutorialProps['steps'];
  frame: number;
  primaryColor: string;
}) {
  const currentStepIndex = steps.reduce((acc, step, i) => {
    return frame >= step.startFrame ? i : acc;
  }, 0);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {steps.map((step, i) => {
        const isActive = i === currentStepIndex;
        return (
          <div
            key={i}
            style={{
              width: isActive ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isActive ? primaryColor : 'rgba(255,255,255,0.4)',
              transition: 'all 0.3s ease',
            }}
          />
        );
      })}
    </div>
  );
}

export function HybridTutorial(props: HybridTutorialProps) {
  const parsed = HybridTutorialPropsSchema.parse(props);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const primaryColor = '#6C63FF';

  const faceSize = Math.round(width * 0.35);
  const facePop = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 200 },
  });

  const currentStep = parsed.steps.reduce(
    (acc: (typeof parsed.steps)[0] | null, step) => (frame >= step.startFrame ? step : acc),
    null,
  );

  const stepLabelOpacity = interpolate(
    spring({ frame: Math.max(0, frame - (currentStep?.startFrame ?? 0)), fps }),
    [0, 1],
    [0, 1],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Main screen recording — top 65% */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.65 }}>
        <Video
          src={parsed.screenSrc}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Border accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: primaryColor,
          }}
        />
      </div>

      {/* Face cam — bottom-right pip */}
      <div
        style={{
          position: 'absolute',
          bottom: height * 0.35 - faceSize / 2,
          right: 24,
          width: faceSize * facePop,
          height: faceSize * facePop,
          borderRadius: faceSize / 2,
          overflow: 'hidden',
          border: `3px solid ${primaryColor}`,
          boxShadow: `0 4px 24px rgba(108,99,255,0.5)`,
        }}
      >
        <Video
          src={parsed.faceSrc}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Step label */}
      {currentStep && (
        <div
          style={{
            position: 'absolute',
            top: height * 0.65 + 24,
            left: 32,
            right: 32,
            opacity: stepLabelOpacity,
          }}
        >
          <div
            style={{
              backgroundColor: primaryColor,
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: 20,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 20,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Paso {parsed.steps.indexOf(currentStep) + 1}
            </span>
          </div>
          <div>
            <span
              style={{
                color: '#fff',
                fontSize: 30,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              {currentStep.label}
            </span>
          </div>
        </div>
      )}

      {/* Title at top */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 24,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '8px 16px',
          borderRadius: 8,
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 26,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
          }}
        >
          {parsed.title}
        </span>
      </div>

      {/* Step indicator dots */}
      <StepIndicator steps={parsed.steps} frame={frame} primaryColor={primaryColor} />
    </AbsoluteFill>
  );
}
