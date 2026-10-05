import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { LAYOUT, SERVERS_TIMING, type Server, getCardTop } from './servers';

type ServerCardProps = {
  server: Server;
  index: number;
  active: boolean;
};

export const ServerCard = ({ server, index, active }: ServerCardProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appearStart = SERVERS_TIMING.cardEntryStart + index * SERVERS_TIMING.cardEntryStagger;
  const appearProgress = spring({
    frame: frame - appearStart,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.6 },
    durationInFrames: SERVERS_TIMING.cardEntryDuration,
  });

  const highlight = spring({
    frame: active ? frame : 0,
    fps,
    from: 0,
    to: 1,
    config: { damping: 16, stiffness: 180, mass: 0.4 },
    durationInFrames: 14,
  });

  const top = getCardTop(index);
  const translateY = interpolate(appearProgress, [0, 1], [40, 0]);
  const scale = 1 + highlight * 0.04;
  const cardOpacity = appearProgress * (active ? 1 : 0.42);

  const borderColor = active ? '#a5b4fc' : 'rgba(148, 163, 184, 0.22)';
  const bgTop = active ? 'rgba(99, 102, 241, 0.24)' : 'rgba(30, 41, 59, 0.55)';
  const bgBottom = active ? 'rgba(67, 56, 202, 0.36)' : 'rgba(15, 23, 42, 0.65)';
  const glow = active
    ? `0 0 0 2px rgba(165,180,252,0.9), 0 30px 60px -20px rgba(129,140,248,0.65), 0 0 90px rgba(129,140,248,${
        0.25 + highlight * 0.35
      })`
    : '0 10px 25px -12px rgba(0,0,0,0.6)';

  return (
    <div
      style={{
        position: 'absolute',
        left: LAYOUT.cardLeft,
        top,
        width: LAYOUT.cardWidth,
        height: LAYOUT.cardHeight,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'center',
        opacity: cardOpacity,
        borderRadius: 32,
        border: `1.5px solid ${borderColor}`,
        background: `linear-gradient(160deg, ${bgTop} 0%, ${bgBottom} 100%)`,
        boxShadow: glow,
        padding: '28px 36px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 36,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          fontSize: 128,
          lineHeight: 1,
          flexShrink: 0,
          filter: active ? 'drop-shadow(0 0 24px rgba(165,180,252,0.85))' : 'none',
        }}
      >
        {server.emoji}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: -1.5,
            lineHeight: 1.05,
            color: active ? '#ffffff' : '#e2e8f0',
          }}
        >
          {server.name}
        </div>
        <div
          style={{
            fontSize: 30,
            color: active ? '#c7d2fe' : '#94a3b8',
            fontWeight: 400,
            lineHeight: 1.25,
          }}
        >
          {server.description}
        </div>
      </div>
    </div>
  );
};
