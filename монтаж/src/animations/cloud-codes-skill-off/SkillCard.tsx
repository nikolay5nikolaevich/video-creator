import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { LAYOUT, type Skill, TIMING, getCardTopLeft } from './skills';

type SkillCardProps = {
  skill: Skill;
  index: number;
  active: boolean;
};

export const SkillCard = ({ skill, index, active }: SkillCardProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appearStart = TIMING.cardsIn.start + index * TIMING.cardsIn.stagger;
  const appearProgress = spring({
    frame: frame - appearStart,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.6 },
    durationInFrames: TIMING.cardsIn.duration,
  });

  const highlight = spring({
    frame: active ? frame : 0,
    fps,
    from: 0,
    to: 1,
    config: { damping: 16, stiffness: 180, mass: 0.4 },
    durationInFrames: 14,
  });

  const { x, y } = getCardTopLeft(index);
  const translateY = interpolate(appearProgress, [0, 1], [40, 0]);
  const scale = 1 + highlight * 0.045;

  const borderColor = active ? '#a5b4fc' : 'rgba(148, 163, 184, 0.25)';
  const bgTop = active ? 'rgba(99, 102, 241, 0.22)' : 'rgba(30, 41, 59, 0.55)';
  const bgBottom = active ? 'rgba(67, 56, 202, 0.35)' : 'rgba(15, 23, 42, 0.65)';
  const glow = active
    ? `0 0 0 2px rgba(165,180,252,0.9), 0 30px 60px -20px rgba(129,140,248,0.65), 0 0 80px rgba(129,140,248,${
        0.25 + highlight * 0.35
      })`
    : '0 10px 25px -12px rgba(0,0,0,0.6)';

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: LAYOUT.cardWidth,
        height: LAYOUT.cardHeight,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'center',
        opacity: appearProgress,
        borderRadius: 28,
        border: `1.5px solid ${borderColor}`,
        background: `linear-gradient(160deg, ${bgTop} 0%, ${bgBottom} 100%)`,
        boxShadow: glow,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: 'white',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          fontSize: 96,
          lineHeight: 1,
          filter: active ? 'drop-shadow(0 0 22px rgba(165,180,252,0.8))' : 'none',
        }}
      >
        {skill.emoji}
      </div>
      <div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: -1,
            color: active ? '#ffffff' : '#e2e8f0',
          }}
        >
          {skill.name}
        </div>
        <div
          style={{
            fontSize: 26,
            marginTop: 10,
            color: active ? '#c7d2fe' : '#94a3b8',
            fontWeight: 400,
          }}
        >
          {skill.description}
        </div>
      </div>
    </div>
  );
};
