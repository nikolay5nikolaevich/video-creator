import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type HelloWorldProps = {
  title: string;
  subtitle: string;
};

export const HelloWorld = ({ title, subtitle }: HelloWorldProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const subtitleOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
      }}
    >
      <div
        style={{
          transform: `scale(${titleScale})`,
          fontSize: 140,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          opacity: subtitleOpacity,
          marginTop: 32,
          fontSize: 56,
          fontWeight: 400,
          color: '#c7d2fe',
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
