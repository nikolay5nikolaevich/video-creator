import { AbsoluteFill, Freeze, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS, RADIUS } from '../../../shared/roblox-devlog-theme';
import { BRoll } from '../BRoll';
import { usePop, useCue, useLayerFade } from '../timing';
import { AppWindow, Cursor, GridBg, HandCircle, SceneTitle, Typed } from '../ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ---------- GFX-21: поиск игр в браузере ----------

const RESULTS: [string, string][] = [
  ['Прятки в предметах', '#7c5cff'],
  ['Спрячься, если сможешь', '#ff7a45'],
  ['Невидимки', '#22c1a3'],
  ['Охота на предметы', '#e9467a'],
];
const FEATURES = ['превращение в предметы', 'охотник ищет игроков', 'короткие раунды'];

export const Browser = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  const win = usePop(0, 16);
  const resultsAt = cue(110.0);
  const click = cue(110.9);
  const pageAt = click + 6;
  const onPage = frame >= pageAt;
  const pageP = usePop(pageAt, 16);

  return (
    <AbsoluteFill style={{ opacity }}>
      <GridBg />
      <AbsoluteFill style={{ transform: `translateY(${(1 - win) * 60}px)`, opacity: win }}>
        <AppWindow title="поиск игр">
          <div style={{ padding: '26px 40px' }}>
            <div
              style={{
                height: 72,
                borderRadius: RADIUS.pill,
                background: '#1b2030',
                border: `2px solid ${COLORS.plateBorder}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 30px',
                gap: 18,
                fontFamily: FONTS.text,
                fontWeight: 600,
                fontSize: 34,
                color: COLORS.text,
              }}
            >
              <span style={{ opacity: 0.6 }}>🔍</span>
              <Typed at={3} text="популярные игры с прятками" cps={20} />
            </div>

            {!onPage && (
              <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {RESULTS.map(([name, color], i) => {
                  const at = resultsAt + i * 3;
                  const p = frame >= at ? Math.min(1, (frame - at) / 6) : 0;
                  const pressed = i === 1 && frame >= click && frame < click + 5;
                  return (
                    <div
                      key={name}
                      style={{
                        height: 230,
                        borderRadius: 20,
                        overflow: 'hidden',
                        background: '#1b2030',
                        border: `2px solid ${i === 1 && frame >= click - 8 ? COLORS.accent : COLORS.plateBorder}`,
                        opacity: p,
                        transform: `translateY(${(1 - p) * 20}px) scale(${pressed ? 0.96 : 1})`,
                        display: 'flex',
                      }}
                    >
                      <div
                        style={{
                          width: 260,
                          background: `linear-gradient(135deg, ${color}, #0b0d14)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 90,
                        }}
                      >
                        {['📦', '🙈', '👻', '🔨'][i]}
                      </div>
                      <div style={{ padding: 24 }}>
                        <div style={{ fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 34, color: COLORS.text }}>{name}</div>
                        <div style={{ marginTop: 10, fontFamily: FONTS.text, fontSize: 24, color: COLORS.textMuted }}>
                          ★ {(4.1 + i * 0.2).toFixed(1)} · прятки · онлайн
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {onPage && (
              <div style={{ marginTop: 30, display: 'flex', gap: 40, opacity: pageP, transform: `translateY(${(1 - pageP) * 30}px)` }}>
                <div
                  style={{
                    width: 420,
                    height: 420,
                    borderRadius: 24,
                    background: 'linear-gradient(135deg, #ff7a45, #0b0d14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 170,
                  }}
                >
                  🙈
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 52, color: COLORS.text }}>Спрячься, если сможешь</div>
                  <div style={{ marginTop: 8, fontFamily: FONTS.text, fontSize: 26, color: COLORS.textMuted }}>Что в игре:</div>
                  {FEATURES.map((f, i) => {
                    const markAt = cue([114.64, 115.54, 116.96][i] ?? 0);
                    const checkAt = cue([118.32, 118.78, 119.4][i] ?? 0);
                    const mark = interpolate(frame, [markAt, markAt + 8], [0, 1], clamp);
                    const check = frame >= checkAt;
                    return (
                      <div key={f} style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            border: `3px solid ${check ? COLORS.accent : COLORS.plateBorder}`,
                            background: check ? COLORS.accent : 'transparent',
                            color: '#0b0d14',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 30,
                            fontWeight: 900,
                          }}
                        >
                          {check ? '✓' : ''}
                        </div>
                        <div
                          style={{
                            position: 'relative',
                            fontFamily: FONTS.text,
                            fontWeight: 700,
                            fontSize: 38,
                            color: COLORS.text,
                            padding: '2px 8px',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(255, 200, 61, 0.35)',
                              transformOrigin: 'left',
                              transform: `scaleX(${mark})`,
                              borderRadius: 6,
                            }}
                          />
                          <span style={{ position: 'relative' }}>{f}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </AppWindow>
        <Cursor a={resultsAt + 6} b={click - 2} from={[1500, 760]} to={[1240, 380]} click={click} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- GFX-6: описание игры для нейросети ----------

const TZ: [number, string][] = [
  [171.3, 'Что делают игроки?'],
  [172.86, 'Как проходит раунд?'],
  [174.3, 'Как работает маскировка?'],
  [175.64, 'Зачем нужны катастрофы?'],
];

export const TzDoc = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  const p = usePop(0, 16);
  return (
    <AbsoluteFill style={{ opacity }}>
      <GridBg />
      <div
        style={{
          position: 'absolute',
          left: 460,
          top: 70,
          width: 1000,
          height: 740,
          borderRadius: 24,
          background: '#f4f1ea',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          padding: '50px 70px',
          opacity: p,
          transform: `translateY(${(1 - p) * 50}px) rotate(${(1 - p) * -2}deg)`,
        }}
      >
        <div style={{ fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 50, color: '#14161f' }}>Описание игры для нейросети</div>
        <div style={{ marginTop: 6, fontFamily: FONTS.mono, fontSize: 24, color: '#7a7466' }}>прятки-roblox / идея.md</div>
        <div style={{ height: 3, background: '#d9d3c4', margin: '26px 0' }} />
        {TZ.map(([t, text], i) => {
          const at = cue(t);
          if (frame < at) return null;
          return (
            <div key={text} style={{ display: 'flex', gap: 18, alignItems: 'baseline', marginTop: 26, fontFamily: FONTS.text, fontWeight: 700, fontSize: 44, color: '#14161f' }}>
              <span style={{ fontFamily: FONTS.mono, color: '#cc785c' }}>{i + 1}.</span>
              <Typed at={at} text={text} cps={36} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- GFX-7: дорожная карта ----------

const ROAD: [number, string, string][] = [
  [191.02, 'Основа', '🧱'],
  [192.66, 'Механика пряток', '📦'],
  [194.86, 'Охотник', '🔨'],
  [195.7, 'Карты', '🗺️'],
  [196.06, 'Способности', '⚡'],
];

export const Roadmap = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  const x0 = 260;
  const x1 = 1660;
  const y = 430;
  const lit = ROAD.reduce((n, [t], i) => (frame >= cue(t) ? i + 1 : n), 0);
  const finalP = interpolate(frame, [cue(197.0), cue(197.0) + 20], [0, 1], clamp);
  const fill = lit <= 1 ? 0 : (lit - 1) / (ROAD.length - 1);
  return (
    <AbsoluteFill style={{ opacity }}>
      <GridBg />
      <SceneTitle>План разработки</SceneTitle>
      <div style={{ position: 'absolute', left: x0, top: y - 5, width: x1 - x0, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.12)' }} />
      <div
        style={{
          position: 'absolute',
          left: x0,
          top: y - 5,
          width: (x1 - x0) * fill,
          height: 10,
          borderRadius: 5,
          background: COLORS.accent,
          boxShadow: `0 0 ${20 + 30 * finalP}px ${COLORS.accent}`,
        }}
      />
      {ROAD.map(([t, name, icon], i) => {
        const at = cue(t);
        const on = frame >= at;
        const p = on ? Math.min(1, (frame - at) / 6) : 0;
        const x = x0 + ((x1 - x0) * i) / (ROAD.length - 1);
        return (
          <div key={name} style={{ position: 'absolute', left: x - 110, top: y - 70, width: 220, textAlign: 'center' }}>
            <div
              style={{
                margin: '0 auto',
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: on ? COLORS.plateSolid : '#14161f',
                border: `5px solid ${on ? COLORS.accent : 'rgba(255,255,255,0.15)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                transform: `scale(${0.85 + 0.15 * p + (on ? 0.08 * Math.max(0, 1 - (frame - at) / 10) : 0)})`,
                filter: on ? 'none' : 'grayscale(1) opacity(0.4)',
                boxShadow: on ? `0 0 30px ${COLORS.accent}66` : 'none',
              }}
            >
              {icon}
            </div>
            <div style={{ marginTop: 16, fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 32, color: on ? COLORS.text : COLORS.textMuted }}>
              {name}
            </div>
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          top: 680,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 48,
          color: COLORS.accent,
          opacity: finalP,
          transform: `translateY(${(1 - finalP) * 20}px)`,
        }}
      >
        …и всё начинает складываться в игру
      </div>
    </AbsoluteFill>
  );
};

// ---------- GFX-22: короткий чат с правкой карты ----------

export const MiniChat = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(4, 6);
  const shot = usePop(0, 16);
  const userAt = 2;
  const agentAt = cue(235.4);
  const agentP = usePop(agentAt);
  return (
    <AbsoluteFill style={{ opacity, background: COLORS.bg }}>
      <AppWindow title="агент · прятки-roblox">
        <div style={{ display: 'flex', gap: 30, padding: 30, height: '100%' }}>
          <div
            style={{
              position: 'relative',
              width: 700,
              height: 394,
              borderRadius: 18,
              overflow: 'hidden',
              border: `2px solid ${COLORS.plateBorder}`,
              opacity: shot,
              transform: `scale(${0.9 + 0.1 * shot})`,
            }}
          >
            <Freeze frame={0}>
              <BRoll file="05_lab_office.mp4" from={1} />
            </Freeze>
            <div style={{ position: 'absolute', inset: 0, transform: 'scale(0.3646)', transformOrigin: '0 0', width: 1920, height: 1080 }}>
              <HandCircle at={3} cx={560} cy={760} rx={330} ry={200} width={22} />
              <HandCircle at={9} cx={1450} cy={700} rx={300} ry={190} width={22} />
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'flex-end', paddingBottom: 30 }}>
            <div
              style={{
                alignSelf: 'flex-end',
                background: COLORS.chatUser,
                borderRadius: 26,
                borderBottomRightRadius: 8,
                padding: '18px 26px',
                fontFamily: FONTS.text,
                fontWeight: 600,
                fontSize: 32,
                lineHeight: 1.3,
                color: COLORS.text,
              }}
            >
              <Typed at={userAt} text="Здесь пусто — добавь коробки и шкафы, чтобы было где спрятаться" cps={48} />
            </div>
            {frame >= agentAt && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: COLORS.chatAgent,
                  border: `2px solid ${COLORS.plateBorder}`,
                  borderRadius: 26,
                  borderBottomLeftRadius: 8,
                  padding: '18px 26px',
                  fontFamily: FONTS.text,
                  fontWeight: 600,
                  fontSize: 32,
                  color: COLORS.text,
                  opacity: agentP,
                  transform: `translateY(${(1 - agentP) * 20}px)`,
                }}
              >
                Принял, переделываю ✓
              </div>
            )}
          </div>
        </div>
      </AppWindow>
    </AbsoluteFill>
  );
};
