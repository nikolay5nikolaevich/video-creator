import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../../shared/roblox-devlog-theme';
import { FPS, isKept, srcToOutFrame } from './edl';
import { SUBTITLE_PHRASES } from './subtitle-data';

/** Окна исходника без субтитров: там текст уже на экране (GFX-1). */
const HIDDEN: readonly (readonly [number, number])[] = [[1.85, 8.35]];

const HOLD_AFTER = Math.round(0.6 * FPS);

type Word = { from: number; to: number; text: string };
type Phrase = { from: number; to: number; words: Word[] };

const hidden = (sec: number) => HIDDEN.some(([a, b]) => sec >= a && sec < b);

const PHRASES: Phrase[] = (() => {
  const list: Phrase[] = [];
  for (const p of SUBTITLE_PHRASES) {
    const kept = p.filter(([s, e]) => isKept((s + e) / 2) && !hidden((s + e) / 2));
    if (kept.length === 0) continue;
    const words = kept.map(([s, e, text]) => ({
      from: srcToOutFrame(s),
      to: Math.max(srcToOutFrame(e), srcToOutFrame(s) + 1),
      text,
    }));
    const first = words[0]!;
    const last = words[words.length - 1]!;
    list.push({ from: first.from, to: last.to + HOLD_AFTER, words });
  }
  // Фраза держится до начала следующей, не дольше HOLD_AFTER после последнего слова.
  list.forEach((p, i) => {
    const next = list[i + 1];
    if (next) p.to = Math.min(p.to, next.from);
  });
  return list;
})();

/** Субтитры на каждом слове: текущее слово подсвечено (караоке). */
export const Subtitles = () => {
  const frame = useCurrentFrame();
  const phrase = PHRASES.find((p) => frame >= p.from && frame < p.to);
  if (!phrase) return null;

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 90 }}>
      <div
        style={{
          maxWidth: 1500,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: '0.38em',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 58,
          lineHeight: 1.15,
          color: COLORS.text,
          WebkitTextStroke: '12px #000',
          paintOrder: 'stroke fill',
          textShadow: '0 4px 18px rgba(0,0,0,0.55)',
        }}
      >
        {phrase.words.map((w, i) => {
          const active = frame >= w.from && frame < (phrase.words[i + 1]?.from ?? phrase.to);
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                color: active ? COLORS.accent : COLORS.text,
                transform: `scale(${active ? 1.05 : 1})`,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
