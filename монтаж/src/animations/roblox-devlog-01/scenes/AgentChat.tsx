import type { ReactNode } from 'react';
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { COLORS, FONTS, LAYOUT, RADIUS } from '../../../shared/roblox-devlog-theme';
import { BRoll } from '../BRoll';
import { usePop, useCue, useLayerFade } from '../timing';

/**
 * GFX-4: переписка с агентом под «процесс выглядит так…».
 * Реплики придуманы для иллюстрации — пользователь может заменить своими.
 */

type Msg =
  | { kind: 'user'; at: number; text: string; tag?: { at: number; text: string } }
  | { kind: 'agent'; at: number; text: string; steps?: readonly (readonly [number, string])[]; shot?: boolean };

const MESSAGES: readonly Msg[] = [
  { kind: 'user', at: 43.41, text: 'Хочу катастрофу со слизью в лаборатории: заливает комнаты по очереди' },
  { kind: 'agent', at: 45.31, text: 'Уточню: как быстро поднимается слизь и где игроки смогут спастись?' },
  { kind: 'user', at: 45.95, text: 'Медленно. Спасаться — на верхних ярусах' },
  {
    kind: 'agent',
    at: 46.63,
    text: 'Делаю:',
    steps: [
      [46.95, 'модель слизи'],
      [47.35, 'скрипт подъёма'],
      [47.75, 'тест в Roblox Studio'],
    ],
  },
  { kind: 'agent', at: 48.03, text: 'Проверил по скриншоту: слизь поднимается ✓', shot: true },
  {
    kind: 'user',
    at: 55.63,
    text: 'Слизь поднимается слишком быстро — игроки не успевают',
    tag: { at: 57.4, text: 'новая задача' },
  },
];

/** Пользователь «печатает» — текст набирается посимвольно. */
const Typed = ({ at, text }: { at: number; text: string }) => {
  const frame = useCurrentFrame();
  const n = Math.floor(interpolate(frame, [at, at + Math.min(text.length * 0.9, 40)], [0, text.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const caret = n < text.length && Math.floor(frame / 8) % 2 === 0;
  return (
    <>
      {text.slice(0, n)}
      <span style={{ opacity: caret ? 1 : 0 }}>▍</span>
    </>
  );
};

const Dots = ({ at }: { at: number }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ letterSpacing: 6 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ opacity: 0.35 + 0.65 * (Math.floor((frame - at) / 4) % 3 === i ? 1 : 0) }}>
          •
        </span>
      ))}
    </span>
  );
};

const Bubble = ({ msg, at, children }: { msg: Msg; at: number; children: ReactNode }) => {
  const p = usePop(at);
  const user = msg.kind === 'user';
  return (
    <div
      style={{
        alignSelf: user ? 'flex-end' : 'flex-start',
        maxWidth: 900,
        opacity: Math.min(1, p * 1.6),
        transform: `translateY(${(1 - p) * 26}px) scale(${0.94 + p * 0.06})`,
        transformOrigin: user ? 'right bottom' : 'left bottom',
        background: user ? COLORS.chatUser : COLORS.chatAgent,
        border: user ? 'none' : `2px solid ${COLORS.plateBorder}`,
        borderRadius: 26,
        borderBottomRightRadius: user ? 8 : 26,
        borderBottomLeftRadius: user ? 26 : 8,
        padding: '18px 26px',
        fontFamily: FONTS.text,
        fontWeight: 600,
        fontSize: 34,
        lineHeight: 1.3,
        color: COLORS.text,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, opacity: 0.6, marginBottom: 4 }}>{user ? 'Я' : 'Агент'}</div>
      {children}
    </div>
  );
};

const Step = ({ at, text }: { at: number; text: string }) => {
  const p = usePop(at);
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', opacity: p, fontFamily: FONTS.mono, fontSize: 30 }}>
      <span style={{ color: COLORS.lab, transform: `scale(${p})`, display: 'inline-block' }}>✓</span>
      {text}
    </div>
  );
};

const AgentBody = ({ msg, at, cue }: { msg: Extract<Msg, { kind: 'agent' }>; at: number; cue: (s: number) => number }) => {
  const frame = useCurrentFrame();
  const THINK = 8;
  if (frame < at + THINK) return <Dots at={at} />;
  return (
    <>
      {msg.text}
      {msg.steps && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {msg.steps.map(([t, s]) => (frame >= cue(t) ? <Step key={s} at={cue(t)} text={s} /> : null))}
        </div>
      )}
      {msg.shot && (
        <div
          style={{
            position: 'relative',
            marginTop: 14,
            width: 520,
            height: 292,
            borderRadius: 16,
            overflow: 'hidden',
            border: `2px solid ${COLORS.plateBorder}`,
          }}
        >
          <Freeze frame={0}>
            <BRoll file="08_lab_slime.mp4" from={6.5} />
          </Freeze>
        </div>
      )}
    </>
  );
};

const Tag = ({ at, text }: { at: number; text: string }) => {
  const p = usePop(at, 10);
  return (
    <div
      style={{
        alignSelf: 'flex-end',
        marginTop: 10,
        opacity: p,
        transform: `scale(${0.7 + p * 0.3})`,
        background: COLORS.accent,
        color: '#111',
        borderRadius: RADIUS.pill,
        padding: '8px 22px',
        fontFamily: FONTS.heavy,
        fontWeight: 900,
        fontSize: 28,
      }}
    >
      ↻ {text}
    </div>
  );
};

const TestInGame = () => {
  const p = usePop(4);
  return (
    <AbsoluteFill>
      <BRoll file="08_lab_slime.mp4" from={6} />
      <div
        style={{
          position: 'absolute',
          top: LAYOUT.safe,
          left: LAYOUT.safe,
          opacity: p,
          transform: `translateX(${(1 - p) * -40}px)`,
          background: COLORS.plate,
          borderRadius: RADIUS.plate,
          padding: '16px 30px',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 44,
          color: COLORS.text,
        }}
      >
        ▶ Я проверяю в игре
      </div>
    </AbsoluteFill>
  );
};

export const AgentChat = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  const testFrom = cue(51.87);
  const testTo = cue(55.45);

  return (
    <AbsoluteFill style={{ opacity, background: COLORS.bg }}>
      <div
        style={{
          position: 'absolute',
          left: (1920 - 1400) / 2,
          top: 60,
          width: 1400,
          height: 760,
          borderRadius: 28,
          background: '#11141f',
          border: `2px solid ${COLORS.plateBorder}`,
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: 64,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 26px',
            borderBottom: `2px solid ${COLORS.plateBorder}`,
          }}
        >
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />
          ))}
          <div style={{ marginLeft: 16, fontFamily: FONTS.mono, fontSize: 24, color: COLORS.textMuted }}>
            агент · прятки-roblox
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 18,
            padding: '24px 36px 30px',
            overflow: 'hidden',
          }}
        >
          {MESSAGES.map((m) => {
            const at = cue(m.at);
            if (frame < at) return null;
            return (
              <div key={m.at} style={{ display: 'flex', flexDirection: 'column' }}>
                <Bubble msg={m} at={at}>
                  {m.kind === 'user' ? <Typed at={at} text={m.text} /> : <AgentBody msg={m} at={at} cue={cue} />}
                </Bubble>
                {m.kind === 'user' && m.tag && frame >= cue(m.tag.at) && <Tag at={cue(m.tag.at)} text={m.tag.text} />}
              </div>
            );
          })}
        </div>
      </div>
      <Sequence from={testFrom} durationInFrames={testTo - testFrom} name="Тест в игре">
        <TestInGame />
      </Sequence>
    </AbsoluteFill>
  );
};
