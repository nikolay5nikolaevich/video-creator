import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS, RADIUS } from '../../../shared/roblox-devlog-theme';
import { BRoll } from '../BRoll';
import { usePop, useCue, useLayerFade } from '../timing';
import { GridBg, plateStyle, SceneTitle } from '../ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ---------- GFX-16: что дальше ----------

const PLANS: [number | null, string, string][] = [
  [null, '🎨', 'Внешний вид карт'],
  [521.57, '⚙️', 'Механики способностей'],
  [525.15, '💰', 'Донат'],
];

export const Plans = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  return (
    <AbsoluteFill style={{ opacity }}>
      <GridBg />
      <SceneTitle>Дальше:</SceneTitle>
      <div style={{ position: 'absolute', top: 210, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        {PLANS.map(([t, icon, text]) => {
          const at = t === null ? 2 : cue(t);
          if (frame < at) return null;
          const p = Math.min(1, (frame - at) / 7);
          return (
            <div
              key={text}
              style={{
                ...plateStyle,
                width: 900,
                padding: '26px 40px',
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                fontFamily: FONTS.heavy,
                fontWeight: 900,
                fontSize: 56,
                color: COLORS.text,
                opacity: p,
                transform: `translateX(${(1 - p) * -80}px)`,
              }}
            >
              <span style={{ fontSize: 64 }}>{icon}</span>
              {text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- GFX-18: два канала + запись экрана телефона ----------

const PHONE_SEGS: [number, number, number][] = [
  // [секунда исходника, секунда записи, скорость]
  [553.87, 3.0, 1],
  [556.3, 25.5, 1.25],
  [558.81, 31.0, 1],
  [561.81, 46.0, 1],
  [563.99, 50.0, 1],
];
const TAGS: [number, string][] = [
  [560.47, 'прятки'],
  [560.95, 'погони'],
  [561.23, 'катастрофы'],
  [561.75, 'смешные ситуации'],
];
const PHONE_FILE = '23_shorts_channel_setup.mp4';

const PhoneFeed = ({ to }: { to: number }) => {
  const cue = useCue();
  return (
    <>
      {PHONE_SEGS.map(([at, from, rate], i) => {
        const start = cue(at);
        const next = PHONE_SEGS[i + 1];
        const end = next ? cue(next[0]) : cue(to);
        if (end <= start) return null;
        return (
          <Sequence key={at} from={start} durationInFrames={end - start} name={`телефон ${from}s`}>
            <BRoll file={PHONE_FILE} from={from} rate={rate} />
          </Sequence>
        );
      })}
    </>
  );
};

export const Channels = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  const card = usePop(0, 16);
  const phase2 = cue(553.87);
  const k = interpolate(frame, [phase2, phase2 + 14], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  const phone = usePop(phase2 + 4, 15);
  const hint = cue(556.3);
  const hintOn = frame >= hint && frame < cue(558.75);
  const hintP = usePop(hint);
  const layerEnd = 567.4;

  // Карточка 1: по центру → маленькая, слева сверху.
  const cardW = 1000;
  const cardScale = 1 - 0.45 * k;
  const cardX = interpolate(k, [0, 1], [(1920 - cardW) / 2, 90]);
  const cardY = interpolate(k, [0, 1], [110, 70]);

  return (
    <AbsoluteFill style={{ opacity }}>
      <GridBg />
      {/* Размытая запись за телефоном — фон второй фазы. */}
      {frame >= phase2 && (
        <AbsoluteFill style={{ opacity: k, filter: 'blur(40px) brightness(0.45)', transform: 'scale(1.2)' }}>
          <PhoneFeed to={layerEnd} />
        </AbsoluteFill>
      )}

      <div
        style={{
          position: 'absolute',
          left: cardX,
          top: cardY,
          width: cardW,
          transform: `scale(${cardScale})`,
          transformOrigin: '0 0',
          opacity: card * (1 - 0.35 * k),
        }}
      >
        <div style={{ ...plateStyle, padding: 24, borderRadius: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ background: COLORS.danger, borderRadius: 10, padding: '4px 14px', fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 28, color: '#fff' }}>▶</div>
            <div style={{ fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 44, color: COLORS.text }}>Канал 1 · RU</div>
            <div style={{ fontFamily: FONTS.text, fontWeight: 700, fontSize: 30, color: COLORS.textMuted }}>девлоги</div>
          </div>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 18, overflow: 'hidden' }}>
            <BRoll file="22a_final_lab_rise.mp4" />
          </div>
        </div>
      </div>

      {frame >= phase2 && (
        <>
          <div style={{ position: 'absolute', left: 100, top: 470, width: 720, opacity: phone }}>
            <div style={{ fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 56, color: COLORS.text }}>
              Канал 2 · <span style={{ color: COLORS.danger }}>Shorts</span> · EN
            </div>
            <div style={{ marginTop: 6, fontFamily: FONTS.mono, fontSize: 32, color: COLORS.textMuted }}>@Clipper_roblox</div>
            <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {TAGS.map(([t, text]) => {
                const at = cue(t);
                if (frame < at) return null;
                const q = Math.min(1, (frame - at) / 5);
                return (
                  <div
                    key={text}
                    style={{
                      background: COLORS.accent,
                      color: '#0b0d14',
                      borderRadius: RADIUS.pill,
                      padding: '10px 24px',
                      fontFamily: FONTS.heavy,
                      fontWeight: 900,
                      fontSize: 34,
                      transform: `scale(${0.6 + 0.4 * q})`,
                      opacity: q,
                    }}
                  >
                    #{text}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Телефон: экран 1180:2556, высота корпуса 800 px. */}
          <div
            style={{
              position: 'absolute',
              left: 1180,
              top: 30,
              width: 393,
              height: 800,
              borderRadius: 54,
              background: '#05060a',
              padding: 12,
              boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,255,255,0.15)',
              transform: `translateY(${(1 - phone) * 120}px) rotate(${(1 - phone) * 6}deg)`,
              opacity: phone,
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden', background: '#000' }}>
              <PhoneFeed to={layerEnd} />
            </div>
          </div>

          {hintOn && (
            <div
              style={{
                position: 'absolute',
                left: 1080,
                top: 40,
                width: 600,
                display: 'flex',
                justifyContent: 'center',
                opacity: hintP,
                transform: `translateY(${(1 - hintP) * -20}px)`,
              }}
            >
              <div
                style={{
                  background: COLORS.accent,
                  color: '#0b0d14',
                  borderRadius: RADIUS.pill,
                  padding: '12px 28px',
                  fontFamily: FONTS.heavy,
                  fontWeight: 900,
                  fontSize: 32,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              >
                настраиваю ленту под Roblox
              </div>
            </div>
          )}
        </>
      )}
    </AbsoluteFill>
  );
};

// ---------- Сплит-экран: две карты ----------

export const Split = () => {
  const opacity = useLayerFade(6, 6);
  const { durationInFrames } = useVideoConfig();
  const rate = 3.5 / (durationInFrames / 30);
  const half = (file: string, label: string, color: string, left: number) => (
    <div style={{ position: 'absolute', left, top: 0, width: 960, height: 1080, overflow: 'hidden' }}>
      <BRoll file={file} from={3} rate={Math.max(0.75, rate)} />
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            ...plateStyle,
            display: 'inline-block',
            padding: '12px 30px',
            fontFamily: FONTS.heavy,
            fontWeight: 900,
            fontSize: 46,
            color,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity, background: '#000' }}>
      {half('22a_final_lab_rise.mp4', 'Лаборатория', COLORS.lab, 0)}
      {half('22b_final_ship_crane.mp4', 'Пиратский корабль', COLORS.ship, 960)}
      <div style={{ position: 'absolute', left: 957, top: 0, width: 6, height: 1080, background: '#fff' }} />
    </AbsoluteFill>
  );
};

// ---------- GFX-27: конечная заставка ----------

const END_CLIPS = ['09_ship_outside.mp4', '22b_final_ship_crane.mp4', '22a_final_lab_rise.mp4'];

export const Endcard = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], clamp);
  const slot = Math.ceil(durationInFrames / END_CLIPS.length);
  const p = usePop(8);
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut, background: '#000' }}>
      {END_CLIPS.map((file, i) => (
        <Sequence key={file} from={i * slot} durationInFrames={slot} name={file}>
          <SlotFade>
            <BRoll file={file} rate={Math.min(1, 7 / (slot / 30))} />
          </SlotFade>
        </Sequence>
      ))}
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.5)' }} />
      <div
        style={{
          position: 'absolute',
          top: 110,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 72,
          color: COLORS.text,
          opacity: p,
          transform: `translateY(${(1 - p) * -30}px)`,
          textShadow: '0 6px 24px rgba(0,0,0,0.6)',
        }}
      >
        Смотри, что будет дальше
      </div>
      {/* Пустые зоны под элементы конечной заставки YouTube. */}
      <div style={{ position: 'absolute', left: 260, top: 360, width: 760, height: 428, borderRadius: 18, border: '3px solid rgba(255,255,255,0.35)', opacity: p }} />
      <div style={{ position: 'absolute', left: 1360, top: 424, width: 300, height: 300, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.35)', opacity: p }} />
    </AbsoluteFill>
  );
};

const SlotFade = ({ children }: { children: ReactNode }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = Math.min(
    interpolate(frame, [0, 10], [0, 1], clamp),
    interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], clamp),
  );
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
