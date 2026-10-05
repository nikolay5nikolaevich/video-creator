import type { CSSProperties } from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { DiagramScene } from './DiagramScene';
import { SCENES, SERVERS } from './servers';
import { ServersGridScene } from './ServersGridScene';

const FONT = 'system-ui, -apple-system, sans-serif';

const HookScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 130 },
    durationInFrames: 22,
  });
  const accent = interpolate(frame, [14, 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bubbleProgress = spring({
    frame: frame - 22,
    fps,
    config: { damping: 14, stiffness: 120 },
    durationInFrames: 22,
  });
  const caretOn = Math.floor(frame / 12) % 2 === 0;

  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: 'white' }}
    >
      <div
        style={{
          fontSize: 32,
          letterSpacing: 8,
          textTransform: 'uppercase',
          color: '#a5b4fc',
          fontWeight: 600,
          opacity: accent,
        }}
      >
        Claude · Claude Code
      </div>
      <div
        style={{
          transform: `scale(${titleScale})`,
          fontSize: 320,
          fontWeight: 900,
          letterSpacing: -14,
          lineHeight: 1,
          marginTop: 32,
          background: 'linear-gradient(135deg, #fff 0%, #c7d2fe 50%, #818cf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        MCP
      </div>
      <div style={{ marginTop: 8, height: 6, width: 320 * accent, background: '#a5b4fc', borderRadius: 3 }} />

      <div
        style={{
          marginTop: 80,
          opacity: bubbleProgress,
          transform: `translateY(${interpolate(bubbleProgress, [0, 1], [30, 0])}px)`,
          position: 'relative',
        }}
      >
        <div
          style={{
            padding: '24px 40px',
            background: 'rgba(30,41,59,0.85)',
            border: '1.5px solid rgba(165,180,252,0.5)',
            borderRadius: 32,
            fontSize: 56,
            fontWeight: 700,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>MCP</span>
          <span
            style={{
              width: 4,
              height: 56,
              background: '#a5b4fc',
              opacity: caretOn ? 1 : 0,
              borderRadius: 2,
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: -18,
            left: 60,
            width: 0,
            height: 0,
            borderLeft: '18px solid transparent',
            borderRight: '18px solid transparent',
            borderTop: '22px solid rgba(30,41,59,0.85)',
          }}
        />
      </div>

      <div
        style={{
          marginTop: 60,
          fontSize: 36,
          color: '#94a3b8',
          letterSpacing: 2,
          textTransform: 'uppercase',
          opacity: accent,
        }}
      >
        ↓ напиши в комменты
      </div>
    </AbsoluteFill>
  );
};

const PromiseScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chipA = spring({ frame, fps, durationInFrames: 18, config: { damping: 14, stiffness: 120 } });
  const chipB = spring({
    frame: frame - 10,
    fps,
    durationInFrames: 18,
    config: { damping: 14, stiffness: 120 },
  });
  const five = spring({
    frame: frame - 30,
    fps,
    durationInFrames: 24,
    config: { damping: 11, stiffness: 130 },
  });
  const sub = interpolate(frame, [50, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const need = interpolate(frame, [80, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chipStyle: CSSProperties = {
    padding: '16px 34px',
    borderRadius: 999,
    border: '1.5px solid rgba(165,180,252,0.55)',
    background: 'rgba(99,102,241,0.18)',
    fontSize: 44,
    fontWeight: 700,
    color: '#fff',
    fontFamily: FONT,
    backdropFilter: 'blur(8px)',
  };

  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: 'white' }}
    >
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ ...chipStyle, opacity: chipA, transform: `translateY(${(1 - chipA) * 24}px)` }}>
          ⚡ Claude
        </div>
        <div style={{ ...chipStyle, opacity: chipB, transform: `translateY(${(1 - chipB) * 24}px)` }}>
          💻 Claude Code
        </div>
      </div>

      <div
        style={{
          fontSize: 520,
          fontWeight: 900,
          letterSpacing: -20,
          lineHeight: 0.9,
          marginTop: 56,
          transform: `scale(${0.7 + five * 0.3})`,
          background: 'linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #818cf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        5
      </div>

      <div
        style={{
          fontSize: 60,
          fontWeight: 700,
          letterSpacing: -1.5,
          color: '#fff',
          opacity: sub,
          transform: `translateY(${(1 - sub) * 20}px)`,
          marginTop: -16,
        }}
      >
        MCP-серверов
      </div>
      <div
        style={{
          fontSize: 36,
          color: '#c7d2fe',
          opacity: need,
          marginTop: 16,
          letterSpacing: 1,
        }}
      >
        которые реально нужны
      </div>
    </AbsoluteFill>
  );
};

const FreeOssScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const freeIn = spring({
    frame,
    fps,
    durationInFrames: 18,
    config: { damping: 12, stiffness: 130 },
  });
  const ossIn = spring({
    frame: frame - 12,
    fps,
    durationInFrames: 18,
    config: { damping: 12, stiffness: 130 },
  });
  const pulse = interpolate(frame % 60, [0, 30, 60], [0.85, 1, 0.85]);
  const allFiveOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const badgeBase: CSSProperties = {
    padding: '36px 56px',
    borderRadius: 36,
    fontSize: 96,
    fontWeight: 900,
    letterSpacing: -2,
    color: '#fff',
    fontFamily: FONT,
    border: '2px solid rgba(165,180,252,0.7)',
    backdropFilter: 'blur(8px)',
  };

  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: 'white' }}
    >
      <div
        style={{
          ...badgeBase,
          opacity: freeIn,
          transform: `scale(${0.85 + freeIn * 0.15})`,
          background: `rgba(99,102,241,${0.18 * pulse})`,
        }}
      >
        FREE
      </div>
      <div style={{ height: 32 }} />
      <div
        style={{
          ...badgeBase,
          opacity: ossIn,
          transform: `scale(${0.85 + ossIn * 0.15})`,
          background: `rgba(67,56,202,${0.28 * pulse})`,
          fontSize: 80,
        }}
      >
        OPEN-SOURCE
      </div>

      <div
        style={{
          marginTop: 80,
          display: 'flex',
          gap: 22,
          opacity: allFiveOpacity,
          transform: `translateY(${(1 - allFiveOpacity) * 24}px)`,
        }}
      >
        {SERVERS.map((s) => (
          <div
            key={s.id}
            style={{
              width: 110,
              height: 110,
              borderRadius: 24,
              border: '1.5px solid rgba(148,163,184,0.32)',
              background: 'rgba(30,41,59,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
            }}
          >
            {s.emoji}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 30,
          color: '#94a3b8',
          letterSpacing: 3,
          textTransform: 'uppercase',
          opacity: allFiveOpacity,
        }}
      >
        все пять
      </div>
    </AbsoluteFill>
  );
};

const StatsScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const anthropicIn = spring({
    frame,
    fps,
    durationInFrames: 18,
    config: { damping: 14, stiffness: 120 },
  });

  const hundredStart = 50;
  const hundredEnd = 90;
  const hundredAppear = spring({
    frame: frame - hundredStart,
    fps,
    durationInFrames: 18,
    config: { damping: 14, stiffness: 120 },
  });
  const hundredCount = Math.round(
    interpolate(frame, [hundredStart, hundredEnd], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const starsStart = 120;
  const starsEnd = 165;
  const starsAppear = spring({
    frame: frame - starsStart,
    fps,
    durationInFrames: 18,
    config: { damping: 14, stiffness: 120 },
  });
  const starsCount = Math.round(
    interpolate(frame, [starsStart, starsEnd], [0, 5000], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const row: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 28,
    fontFamily: FONT,
    color: '#fff',
  };

  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: 'white', gap: 40 }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: -1,
          padding: '20px 40px',
          borderRadius: 28,
          background: 'rgba(204,120,92,0.18)',
          border: '1.5px solid rgba(204,120,92,0.55)',
          color: '#fed7aa',
          opacity: anthropicIn,
          transform: `translateY(${(1 - anthropicIn) * 28}px) scale(${0.9 + anthropicIn * 0.1})`,
        }}
      >
        by Anthropic
      </div>

      <div style={{ ...row, opacity: hundredAppear, transform: `translateY(${(1 - hundredAppear) * 24}px)` }}>
        <div
          style={{
            fontSize: 240,
            fontWeight: 900,
            letterSpacing: -10,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #fff 0%, #c7d2fe 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {hundredCount}+
        </div>
        <div style={{ fontSize: 36, color: '#c7d2fe', letterSpacing: 1 }}>MCP-серверов</div>
      </div>

      <div style={{ ...row, opacity: starsAppear, transform: `translateY(${(1 - starsAppear) * 24}px)` }}>
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            letterSpacing: -8,
            lineHeight: 1,
            color: '#fde68a',
          }}
        >
          {starsCount.toLocaleString('ru-RU')}
          <span style={{ fontSize: 120 }}>⭐</span>
        </div>
        <div style={{ fontSize: 36, color: '#c7d2fe', letterSpacing: 1 }}>на GitHub</div>
      </div>
    </AbsoluteFill>
  );
};

export const McpFiveServers = () => {
  const frame = useCurrentFrame();
  const bgPulse = interpolate(frame % 120, [0, 60, 120], [0, 1, 0]);

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0b1026 55%, #050816 100%)',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 20% 80%, rgba(99,102,241,0.18) 0%, transparent 55%)',
          opacity: 0.6 + bgPulse * 0.25,
        }}
      />

      <Sequence from={SCENES.hook.from} durationInFrames={SCENES.hook.duration}>
        <HookScene />
      </Sequence>
      <Sequence from={SCENES.promise.from} durationInFrames={SCENES.promise.duration}>
        <PromiseScene />
      </Sequence>
      <Sequence from={SCENES.diagram.from} durationInFrames={SCENES.diagram.duration}>
        <DiagramScene />
      </Sequence>
      <Sequence from={SCENES.servers.from} durationInFrames={SCENES.servers.duration}>
        <ServersGridScene />
      </Sequence>
      <Sequence from={SCENES.freeOss.from} durationInFrames={SCENES.freeOss.duration}>
        <FreeOssScene />
      </Sequence>
      <Sequence from={SCENES.stats.from} durationInFrames={SCENES.stats.duration}>
        <StatsScene />
      </Sequence>
    </AbsoluteFill>
  );
};
