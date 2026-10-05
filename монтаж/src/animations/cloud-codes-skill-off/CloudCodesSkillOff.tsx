import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Cursor } from './Cursor';
import { SkillCard } from './SkillCard';
import { LAYOUT, SKILLS, TIMING, getCardCenter } from './skills';

type CursorState = {
  x: number;
  y: number;
  activeIndex: number | null;
  pressed: boolean;
};

function useCursorState(frame: number, fps: number): CursorState {
  const startX = 120;
  const startY = 220;

  if (frame < TIMING.cursorStart) {
    return { x: startX, y: startY, activeIndex: null, pressed: false };
  }

  const stepLen = TIMING.transitionFrames + TIMING.dwellFrames;
  const t = frame - TIMING.cursorStart;
  const stepIndex = Math.min(Math.floor(t / stepLen), SKILLS.length - 1);
  const inStep = t - stepIndex * stepLen;

  const prev = stepIndex === 0 ? { x: startX, y: startY } : getCardCenter(stepIndex - 1);
  const next = getCardCenter(stepIndex);

  if (inStep < TIMING.transitionFrames) {
    const progress = spring({
      frame: inStep,
      fps,
      config: { damping: 14, stiffness: 85, mass: 0.7 },
      durationInFrames: TIMING.transitionFrames,
    });
    const x = interpolate(progress, [0, 1], [prev.x, next.x]);
    const y = interpolate(progress, [0, 1], [prev.y, next.y]);
    const arrived = progress > 0.55;
    return {
      x,
      y,
      activeIndex: arrived ? stepIndex : stepIndex === 0 ? null : stepIndex - 1,
      pressed: false,
    };
  }

  const dwellLocal = inStep - TIMING.transitionFrames;
  const pressed = dwellLocal >= 4 && dwellLocal <= 10;

  return { x: next.x, y: next.y, activeIndex: stepIndex, pressed };
}

export const CloudCodesSkillOff = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(
    frame,
    [TIMING.titleIn.start, TIMING.titleIn.end],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const titleY = interpolate(
    frame,
    [TIMING.titleIn.start, TIMING.titleIn.end],
    [-20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const { x, y, activeIndex, pressed } = useCursorState(frame, fps);

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

      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
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
          Skill Directory
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
          Cloud Codes
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 300,
            color: '#e0e7ff',
            letterSpacing: -1,
            marginTop: -8,
          }}
        >
          Skill-Off
        </div>
      </div>

      {SKILLS.map((skill, i) => (
        <SkillCard key={skill.id} skill={skill} index={i} active={activeIndex === i} />
      ))}

      <Cursor
        x={x}
        y={y}
        pressed={pressed}
        visible={frame >= TIMING.cursorStart - TIMING.cursorIdleAtStart}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#64748b',
          fontSize: 24,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {activeIndex !== null ? `▸ ${SKILLS[activeIndex]?.name}` : '▸ hovering…'}
      </div>
    </AbsoluteFill>
  );
};
