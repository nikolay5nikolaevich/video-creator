// Монтажный лист: какие куски исходника выбрасываются.
// ВСЕ времена в проекте — секунды ИСХОДНИКА (myvideo/IMG_9303.MP4), см. монтаж/план-монтажа.md, раздел 0.
// Время готового ролика получаем только через srcToOutFrame().

export const FPS = 30;
export const SOURCE_DURATION = 622.04;

/** C6 (запинка на 164,90–170,90) — вырезать или нет, решает пользователь после прослушивания. */
export const CUT_C6 = false;

/** Вырезки C1–C16 из плана. Границы первой минуты уточнены по silencedetect. */
export const CUTS: readonly (readonly [number, number])[] = [
  [0, 1.85], // C1 тишина в начале
  [8.1, 9.95], // C2
  [18.55, 21.35], // C3
  [88.85, 97.7], // C4 пауза + второй дубль «…самому» (94,6–97,3); «Чтобы» с 97,8
  [121.0, 132.95], // C5 первый дубль «остановился на прятках»
  ...(CUT_C6 ? ([[164.9, 170.9]] as const) : []), // C6
  [237.1, 238.5], // C7 — «Приходилось» начинается на 238,6 (по громкости)
  [251.9, 257.2], // C8 пауза + протяжное «Иии…»; «И всей…» с 257,25
  [273.45, 277.25], // C9 пауза + оговорка «и мне хочется, чтобы игроки пробовали их»
  [308.0, 311.5], // C10
  [377.8, 392.2], // C11 первый дубль списка способностей
  [421.6, 426.2], // C12 «Но после этого удара…»
  [454.9, 464.8], // C13 «Прыжок.» + пауза
  [494.2, 500.4], // C14
  [567.4, 576.6], // C15 фальстарт «Потом уже сделать игру,»
  [620.2, SOURCE_DURATION], // C16 хвост
  // Паузы > 0,8 с вне ручных вырезок (silencedetect −35 dB по исходнику), сокращены до ~0,4 с.
  // Слова расшифровки внутрь не попадают.
  [297.62, 298.95],
  [440.74, 441.2],
  [612.61, 613.15],
  // Правки после просмотра пользователем (02.10.2026), границы — по громкости исходника:
  [73.65, 75.15], // 1:05 — пауза между «прятался» и «а человек»
  [107.3, 109.75], // 1:33 — «Перед этим,» (оставлено «перед выбором темы»)
  [145.2, 149.85], // ~2:00 — два неудачных дубля «а потом в комнату (начинает затапливать)»
  [189.1, 190.85], // 2:42 — «ааа» перед «Сначала основа»
  [206.85, 210.45], // ~3:00 — первый дубль «Она могла сделать помещение»
];

/**
 * Окно исходника, которое сейчас рендерится. null — весь ролик.
 * Для пробных кусков ставь, например, [0, 60.4].
 */
export const PREVIEW: readonly [number, number] | null = null;

/** Конечная заставка после конца речи (GFX-27), только для полного ролика. */
export const ENDCARD_FRAMES = PREVIEW ? 0 : 20 * FPS;

type Keep = { srcFrom: number; srcTo: number; outFrom: number };

const toFrame = (sec: number) => Math.round(sec * FPS);

const buildKeeps = (): Keep[] => {
  const range: readonly [number, number] = PREVIEW ?? [0, SOURCE_DURATION];
  const [lo, hi] = range;
  const cuts = [...CUTS].sort((a, b) => a[0] - b[0]);
  const keeps: Keep[] = [];
  let cursor = lo;
  let out = 0;
  const push = (from: number, to: number) => {
    const srcFrom = toFrame(from);
    const srcTo = toFrame(to);
    if (srcTo <= srcFrom) return;
    keeps.push({ srcFrom, srcTo, outFrom: out });
    out += srcTo - srcFrom;
  };
  for (const [a, b] of cuts) {
    if (b <= cursor || a >= hi) continue;
    push(cursor, Math.min(a, hi));
    cursor = Math.max(cursor, b);
  }
  push(cursor, hi);
  return keeps;
};

/** Оставленные куски A-roll: кадры исходника [srcFrom, srcTo) → кадр ролика outFrom. */
export const KEEPS = buildKeeps();

/** Длина склеенного A-roll в кадрах. */
export const AROLL_FRAMES = KEEPS.reduce((n, k) => n + (k.srcTo - k.srcFrom), 0);

export const TOTAL_FRAMES = AROLL_FRAMES + ENDCARD_FRAMES;

/** Секунда исходника → кадр готового ролика. Время внутри вырезки прижимается к месту склейки. */
export const srcToOutFrame = (sec: number): number => {
  const f = sec * FPS;
  const first = KEEPS[0];
  if (!first) return 0;
  if (f <= first.srcFrom) return first.outFrom;
  for (const k of KEEPS) {
    if (f < k.srcTo) return Math.round(k.outFrom + Math.max(0, f - k.srcFrom));
  }
  return AROLL_FRAMES;
};

/** Попадает ли секунда исходника в оставленный кусок (для отбрасывания слов субтитров). */
export const isKept = (sec: number): boolean => {
  const f = sec * FPS;
  return KEEPS.some((k) => f >= k.srcFrom && f < k.srcTo);
};
