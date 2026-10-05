import { Audio, interpolate, Sequence } from 'remotion';
import { asset } from '../../assets';
import { SLUG } from './ARoll';
import { AROLL_FRAMES, FPS, srcToOutFrame, TOTAL_FRAMES } from './edl';
import { SFX_FILES, MUSIC_FILE } from './sound-files';
import { SFX, type SfxName } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Громкость эффектов (файлы нормализованы до пика −3 dBFS). Эффекты — тише голоса. */
const SFX_VOLUME: Record<SfxName, number> = {
  pop: 0.3,
  typing: 0.22,
  click: 0.45,
  boom: 0.55,
  tick: 0.28,
  whoosh: 0.3,
};
const LOOPED: ReadonlySet<SfxName> = new Set(['typing', 'tick']);

/** Музыка под голосом (~ −28 дБ к голосу); пропадает на главной мысли, громче на заставке. */
const MUSIC_BED = 0.07;
const SILENCE: [number, number] = [srcToOutFrame(540.87), srcToOutFrame(543.6)];

const musicVolume = (f: number) => {
  const dip = Math.min(
    interpolate(f, [SILENCE[0] - 8, SILENCE[0]], [1, 0], clamp),
    1,
  );
  const back = interpolate(f, [SILENCE[1], SILENCE[1] + 20], [0, 1], clamp);
  const silenceK = f < SILENCE[0] ? dip : f < SILENCE[1] ? 0 : back;
  const endcard = interpolate(f, [AROLL_FRAMES - 6, AROLL_FRAMES + 12], [MUSIC_BED, 0.32], clamp);
  const fadeIn = interpolate(f, [0, 20], [0, 1], clamp);
  const fadeOut = interpolate(f, [TOTAL_FRAMES - 45, TOTAL_FRAMES], [1, 0], clamp);
  return endcard * silenceK * fadeIn * fadeOut;
};

export const Sound = () => {
  const available = new Set<string>(SFX_FILES);
  return (
    <>
      {MUSIC_FILE && <Audio src={asset(SLUG, `sound/${MUSIC_FILE}`)} loop volume={musicVolume} />}
      {SFX.map(([t, name, dur]) => {
        if (!available.has(name)) return null;
        const from = srcToOutFrame(t);
        const len = Math.round((dur ?? 3) * FPS);
        return (
          <Sequence key={`${t}-${name}`} from={from} durationInFrames={len} name={`звук ${name}`} layout="none">
            <Audio src={asset(SLUG, `sound/${name}.mp3`)} volume={SFX_VOLUME[name]} loop={LOOPED.has(name)} />
          </Sequence>
        );
      })}
    </>
  );
};
