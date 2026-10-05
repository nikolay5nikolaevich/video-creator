import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { SERVERS, SERVERS_TIMING } from './servers';
import { ServerCard } from './ServerCard';

export const ServersGridScene = () => {
  const frame = useCurrentFrame();

  const activeIndex = Math.max(
    0,
    Math.min(SERVERS.length - 1, Math.floor(frame / SERVERS_TIMING.activeSlotFrames)),
  );

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [0, 18], [-16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          color: 'white',
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: '#a5b4fc',
            fontWeight: 600,
          }}
        >
          MCP-серверы
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -3,
            marginTop: 14,
            background: 'linear-gradient(135deg, #fff 0%, #c7d2fe 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          ТОП 5
        </div>
      </div>

      {SERVERS.map((server, i) => (
        <ServerCard key={server.id} server={server} index={i} active={activeIndex === i} />
      ))}

      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#64748b',
          fontSize: 26,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        ▸ {SERVERS[activeIndex]?.name ?? ''}
      </div>
    </AbsoluteFill>
  );
};
