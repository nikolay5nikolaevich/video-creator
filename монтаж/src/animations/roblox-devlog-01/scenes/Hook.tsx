import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS, LAYOUT, RADIUS } from '../../../shared/roblox-devlog-theme';
import { BRoll } from '../BRoll';
import { usePop, useCue, useLayerFade } from '../timing';

/** GFX-1: вопрос-заголовок, слова появляются вслед за речью. */
const QUESTION: readonly (readonly [number, string, boolean?])[] = [
  [1.84, 'Можно'],
  [2.72, 'ли'],
  [3.14, 'заработать', true],
  [3.7, 'в 2026 году'],
  [5.02, 'на своей игре'],
  [5.8, 'в Roblox,'],
  [6.36, 'имея'],
  [6.8, 'только'],
  [7.2, 'Claude Code?', true],
];

const QuestionWord = ({ at, text, accent }: { at: number; text: string; accent?: boolean }) => {
  const p = usePop(at);
  return (
    <span
      style={{
        display: 'inline-block',
        margin: '0 0.18em',
        opacity: Math.min(1, p * 1.4),
        transform: `translateY(${(1 - p) * 30}px) scale(${0.85 + p * 0.15})`,
        color: accent ? COLORS.accent : COLORS.text,
      }}
    >
      {text}
    </span>
  );
};

export const QuestionTitle = () => {
  const cue = useCue();
  const opacity = useLayerFade(4, 8);
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(0,0,0,0.7) 100%)' }}
      />
      {/* Внизу кадра, на месте субтитров: лицо остаётся целиком (план, раздел 5, правило 3). */}
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 60 }}>
        <div
          style={{
            maxWidth: 1500,
            textAlign: 'center',
            fontFamily: FONTS.heavy,
            fontWeight: 900,
            fontSize: 60,
            lineHeight: 1.1,
            textShadow: '0 6px 28px rgba(0,0,0,0.6)',
          }}
        >
          {QUESTION.map(([t, text, accent]) => (
            <QuestionWord key={text} at={cue(t)} text={text} accent={accent} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** GFX-26: счётчик «Заработано: 0 ₽», цифры прокручиваются барабаном и встают на 0. */
export const EarnCounter = ({ footer }: { footer?: { at: number; text: string } }) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const p = usePop(0, 16);
  const opacity = useLayerFade(0, 8);
  const ROLL = 22;
  const DIGIT_H = 92;
  // Барабан: 9 8 7 … 0, крутится ROLL кадров с замедлением.
  const roll = interpolate(frame, [0, ROLL], [0, 9], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  const footerP = usePop(footer ? cue(footer.at) : 1e9);
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: 'absolute',
          top: LAYOUT.safe,
          right: LAYOUT.safe,
          transform: `translateY(${(1 - p) * -40}px)`,
          opacity: p,
          background: COLORS.plate,
          border: `2px solid ${COLORS.plateBorder}`,
          borderRadius: RADIUS.plate,
          padding: '18px 30px 20px',
          minWidth: 300,
        }}
      >
        <div style={{ fontFamily: FONTS.text, fontWeight: 700, fontSize: 28, color: COLORS.textMuted }}>
          Заработано:
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ height: DIGIT_H, overflow: 'hidden' }}>
            <div style={{ transform: `translateY(${-roll * DIGIT_H}px)` }}>
              {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((d) => (
                <div
                  key={d}
                  style={{
                    height: DIGIT_H,
                    fontFamily: FONTS.mono,
                    fontWeight: 700,
                    fontSize: 84,
                    lineHeight: `${DIGIT_H}px`,
                    color: COLORS.accent,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 70, color: COLORS.accent }}>₽</div>
        </div>
        {footer && (
          <div
            style={{
              fontFamily: FONTS.text,
              fontWeight: 700,
              fontSize: 26,
              color: COLORS.text,
              opacity: footerP,
            }}
          >
            {footer.text}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Быстрая нарезка самых ярких кадров игры под «создание игры и её продвижение». */
const MONTAGE: readonly (readonly [string, number])[] = [
  ['03_lab_outside.mp4', 1],
  ['08_lab_slime.mp4', 6],
  ['09_ship_outside.mp4', 2],
  ['13_ship_big_meteor.mp4', 5.5],
  ['15_ability_dash.mp4', 1],
  ['22b_final_ship_crane.mp4', 0],
];

const MontageSlot = ({ file, from }: { file: string; from: number }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.07]);
  // Короткая вспышка на входе каждого клипа — даёт ритм.
  const flash = interpolate(frame, [0, 4], [0.35, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <BRoll file={file} from={from} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
    </AbsoluteFill>
  );
};

export const HookMontage = () => {
  const { durationInFrames } = useVideoConfig();
  const slot = durationInFrames / MONTAGE.length;
  return (
    <AbsoluteFill>
      {MONTAGE.map(([file, from], i) => {
        const start = Math.round(i * slot);
        const end = Math.round((i + 1) * slot);
        return (
          <Sequence key={file} from={start} durationInFrames={end - start} name={file}>
            <MontageSlot file={file} from={from} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
