import type { CSSProperties } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const LEAVES = [
  { id: 'internet', emoji: '🌐', label: 'интернет' },
  { id: 'data', emoji: '📊', label: 'данные' },
  { id: 'systems', emoji: '⚙️', label: 'системы' },
] as const;

const CANVAS_W = 1080;
const CLAUDE_TOP = 360;
const CLAUDE_HEIGHT = 160;
const ARROW1_TOP = CLAUDE_TOP + CLAUDE_HEIGHT;
const ARROW1_LEN = 90;
const MCP_TOP = ARROW1_TOP + ARROW1_LEN;
const MCP_HEIGHT = 200;
const SUB_TOP = MCP_TOP + MCP_HEIGHT + 16;
const ARROW2_TOP = SUB_TOP + 80;
const ARROW2_LEN = 110;
const LEAVES_TOP = ARROW2_TOP + ARROW2_LEN + 20;
const LEAF_W = 290;
const LEAF_H = 220;
const LEAF_GAP = 24;
const LEAVES_TOTAL_W = LEAF_W * 3 + LEAF_GAP * 2;
const LEAVES_LEFT = (CANVAS_W - LEAVES_TOTAL_W) / 2;

const node = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 28,
  border: `1.5px solid ${active ? 'rgba(165,180,252,0.85)' : 'rgba(148,163,184,0.22)'}`,
  background: active
    ? 'linear-gradient(160deg, rgba(99,102,241,0.28) 0%, rgba(67,56,202,0.42) 100%)'
    : 'linear-gradient(160deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.65) 100%)',
  boxShadow: active
    ? '0 0 0 2px rgba(165,180,252,0.6), 0 0 80px rgba(129,140,248,0.45)'
    : '0 10px 25px -12px rgba(0,0,0,0.6)',
  color: 'white',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  backdropFilter: 'blur(8px)',
});

export const DiagramScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 110 },
    durationInFrames: 22,
  });

  const claudeProgress = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14, stiffness: 120 },
    durationInFrames: 22,
  });

  const arrow1Width = interpolate(frame, [34, 60], [0, ARROW1_LEN], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const mcpProgress = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14, stiffness: 120 },
    durationInFrames: 22,
  });

  const subLabelOpacity = interpolate(frame, [88, 112], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const branchStart = 120;
  const branchStagger = 16;
  const arrow2Stretch = (i: number) =>
    interpolate(frame, [branchStart + i * branchStagger, branchStart + i * branchStagger + 26], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  const leafProgress = (i: number) =>
    spring({
      frame: frame - (branchStart + i * branchStagger + 18),
      fps,
      config: { damping: 14, stiffness: 120 },
      durationInFrames: 22,
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
          color: 'white',
          opacity: titleProgress,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [-16, 0])}px)`,
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
          Model Context Protocol
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: -2,
            marginTop: 12,
            background: 'linear-gradient(135deg, #fff 0%, #c7d2fe 50%, #818cf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Как MCP работает
        </div>
      </div>

      <div
        style={{
          ...node(false),
          position: 'absolute',
          top: CLAUDE_TOP,
          left: (CANVAS_W - 500) / 2,
          width: 500,
          height: CLAUDE_HEIGHT,
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: -1.5,
          opacity: claudeProgress,
          transform: `scale(${0.9 + claudeProgress * 0.1})`,
        }}
      >
        Claude
      </div>

      <div
        style={{
          position: 'absolute',
          top: ARROW1_TOP,
          left: CANVAS_W / 2 - 3,
          width: 6,
          height: arrow1Width,
          background: '#a5b4fc',
          borderRadius: 3,
        }}
      />

      <div
        style={{
          ...node(true),
          position: 'absolute',
          top: MCP_TOP,
          left: (CANVAS_W - 560) / 2,
          width: 560,
          height: MCP_HEIGHT,
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: -3,
          opacity: mcpProgress,
          transform: `scale(${0.9 + mcpProgress * 0.1})`,
        }}
      >
        MCP
      </div>

      <div
        style={{
          position: 'absolute',
          top: SUB_TOP,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#c7d2fe',
          fontSize: 26,
          opacity: subLabelOpacity,
          letterSpacing: 1,
        }}
      >
        внешние инструменты и данные в реальном времени
      </div>

      {LEAVES.map((leaf, i) => {
        const stretch = arrow2Stretch(i);
        const lp = leafProgress(i);
        const leafLeft = LEAVES_LEFT + i * (LEAF_W + LEAF_GAP);
        const leafCenterX = leafLeft + LEAF_W / 2;
        const mcpCenterX = CANVAS_W / 2;
        const dx = leafCenterX - mcpCenterX;
        const dy = ARROW2_LEN;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <div key={leaf.id}>
            <div
              style={{
                position: 'absolute',
                top: ARROW2_TOP,
                left: mcpCenterX,
                width: length * stretch,
                height: 5,
                background: '#a5b4fc',
                borderRadius: 3,
                transformOrigin: '0 50%',
                transform: `rotate(${angleDeg}deg)`,
              }}
            />
            <div
              style={{
                ...node(false),
                position: 'absolute',
                top: LEAVES_TOP,
                left: leafLeft,
                width: LEAF_W,
                height: LEAF_H,
                flexDirection: 'column',
                gap: 12,
                opacity: lp,
                transform: `translateY(${interpolate(lp, [0, 1], [30, 0])}px)`,
              }}
            >
              <div style={{ fontSize: 88, lineHeight: 1 }}>{leaf.emoji}</div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>{leaf.label}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
