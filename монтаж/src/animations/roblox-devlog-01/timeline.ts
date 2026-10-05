// Таймлайн девлога — по монтаж/план-монтажа.md, раздел 4. Только данные, без JSX:
// так его можно проверять скриптом (tools/roblox-devlog-check.ts) на правила кадра.
// Все времена — секунды ИСХОДНИКА. `full: true` — слой закрывает лицо целиком.

export type Seg = {
  /** Секунда исходника, с которой играет этот кусок клипа (до следующего куска или конца слоя). */
  at: number;
  file: string;
  /** Секунда внутри клипа. */
  from?: number;
  rate?: number;
  /** Стоп-кадр вместо воспроизведения. */
  freeze?: boolean;
};

export type ClipFx = {
  /** Удар: тряска + вспышка (+ звук boom). */
  hits?: number[];
  /** Красная рамка «ОПАСНОСТЬ» [от, до]. */
  alarm?: [number, number];
  vignette?: { color: 'lab' | 'ship'; from: number };
};

export type Layer =
  | { kind: 'clip'; from: number; to: number; full: true; segs: Seg[]; fx?: ClipFx }
  | { kind: 'gfx'; id: GfxId; from: number; to: number; full: boolean; props?: Record<string, unknown> };

export type GfxId =
  | 'question'
  | 'counter'
  | 'montage'
  | 'tools'
  | 'mcp'
  | 'chat'
  | 'plate'
  | 'spot'
  | 'browser'
  | 'tzdoc'
  | 'roadmap'
  | 'miniChat'
  | 'markers'
  | 'title'
  | 'rooms'
  | 'minimap'
  | 'abilityGrid'
  | 'abilityCard'
  | 'shield'
  | 'plans'
  | 'twoLines'
  | 'channels'
  | 'split'
  | 'subscribe'
  | 'comment'
  | 'endcard';

const clip = (from: number, to: number, segs: Seg[], fx?: ClipFx): Layer => ({
  kind: 'clip',
  from,
  to,
  full: true,
  segs,
  fx,
});
const full = (id: GfxId, from: number, to: number, props?: Record<string, unknown>): Layer => ({
  kind: 'gfx',
  id,
  from,
  to,
  full: true,
  props,
});
const over = (id: GfxId, from: number, to: number, props?: Record<string, unknown>): Layer => ({
  kind: 'gfx',
  id,
  from,
  to,
  full: false,
  props,
});

export const LAYERS: Layer[] = [
  // ---------- Блок 1. Хук и вступление ----------
  over('question', 1.85, 8.1),
  over('counter', 3.14, 8.1),
  full('montage', 10.74, 18.55),
  over('tools', 24.79, 29.6),
  full('mcp', 29.6, 40.0),
  full('chat', 43.2, 60.4),

  // ---------- Блок 2. Откуда идея ----------
  over('plate', 66.53, 69.89, { text: 'В детстве: прятки в Minecraft', color: 'accent' }),
  clip(69.89, 79.2, [{ at: 69.89, file: '01_disguise.mp4', rate: 0.75 }]),
  full('spot', 79.2, 84.5, { at: 82.13 }),
  clip(97.02, 102.02, [{ at: 97.02, file: '06_hideout_lab.mp4' }]),
  full('browser', 108.14, 121.0),
  clip(138.72, 143.0, [{ at: 138.72, file: '06_hideout_ship.mp4' }]),
  clip(
    150.5,
    159.7,
    [
      { at: 150.5, file: '14_ship_flood.mp4', from: 1.5 },
      { at: 151.86, file: '13_ship_big_meteor.mp4', from: 6.3 },
      { at: 153.98, file: '15_ability_dash.mp4', rate: 0.88 },
    ],
    { hits: [152.86] },
  ),

  // ---------- Блок 3. Как делал с нейросетью ----------
  full('tzdoc', 171.3, 180.5),
  full('roadmap', 191.02, 200.1),
  over('plate', 207.1, 216.5, { text: 'Проблема: карты получались пустыми', color: 'danger' }),
  clip(224.54, 233.54, [
    { at: 224.54, file: '05_lab_warehouse.mp4' },
    { at: 229.54, file: '04_lab_corridor.mp4' },
  ]),
  full('miniChat', 233.54, 236.6),
  clip(247.23, 251.9, [{ at: 247.23, file: '22a_final_lab_rise.mp4' }]),
  over('markers', 247.23, 251.9),

  // ---------- Блок 4. Лаборатория ----------
  clip(264.27, 274.1, [
    { at: 264.27, file: '03_lab_outside.mp4' },
    { at: 266.67, file: '05_lab_warehouse.mp4' },
    { at: 267.39, file: '05_lab_office.mp4' },
    { at: 267.93, file: '05_lab_server.mp4' },
    { at: 268.89, file: '05_lab_reactor.mp4' },
    { at: 269.59, file: '04_lab_corridor.mp4' },
  ]),
  over('title', 264.27, 266.6, { small: 'КАРТА 1', big: 'ЛАБОРАТОРИЯ', color: 'lab' }),
  over('rooms', 266.67, 274.1, {
    items: [
      [266.67, 'Склад'],
      [267.39, 'Офис'],
      [267.93, 'Серверная'],
      [268.89, 'Реакторная'],
      [269.59, 'Центральный коридор'],
    ],
  }),
  over('minimap', 266.67, 274.1, {
    map: 'lab',
    marks: [
      [266.67, 'warehouse'],
      [267.39, 'office'],
      [267.93, 'server'],
      [268.89, 'reactor'],
      [269.59, 'corridor'],
    ],
  }),
  clip(277.2, 285.95, [{ at: 277.2, file: '06_hideout_lab.mp4', rate: 0.8 }]),
  over('plate', 291.91, 300.0, { text: 'Охотник · молот', color: 'danger' }),
  clip(321.12, 337.6, [{ at: 321.12, file: '08_lab_slime.mp4', rate: 0.91 }], {
    vignette: { color: 'lab', from: 321.12 },
  }),
  over('title', 321.12, 323.6, { small: 'КАТАСТРОФА', big: 'СЛИЗЬ', color: 'lab' }),

  // ---------- Блок 5. Корабль ----------
  clip(337.6, 350.66, [
    { at: 337.6, file: '09_ship_outside.mp4' },
    { at: 342.9, file: '10_ship_hold.mp4' },
    { at: 343.28, file: '10_ship_brig.mp4' },
    { at: 344.14, file: '10_ship_gundeck.mp4' },
    { at: 345.34, file: '10_ship_cabin.mp4' },
    { at: 346.78, file: '11_ship_upperdeck.mp4' },
  ]),
  over('title', 337.6, 340.1, { small: 'КАРТА 2', big: 'ПИРАТСКИЙ КОРАБЛЬ', color: 'ship' }),
  over('rooms', 342.9, 350.66, {
    items: [
      [342.9, 'Трюм'],
      [343.28, 'Карцер'],
      [344.14, 'Орудийная палуба'],
      [345.34, 'Каюта капитана'],
      [346.78, 'Верхняя палуба'],
    ],
  }),
  over('minimap', 342.9, 350.66, {
    map: 'ship',
    marks: [
      [342.9, 'hold'],
      [343.28, 'brig'],
      [344.14, 'gundeck'],
      [345.34, 'cabin'],
      [346.78, 'upper'],
    ],
  }),
  clip(
    350.66,
    368.2,
    [
      { at: 350.66, file: '12_ship_meteor_wide.mp4' },
      { at: 354.14, file: '12_ship_meteor_close.mp4', rate: 0.85 },
      { at: 359.98, file: '14_ship_flood.mp4' },
    ],
    { alarm: [355.78, 357.66], hits: [357.66], vignette: { color: 'ship', from: 359.98 } },
  ),
  over('title', 350.66, 353.2, { small: 'КАТАСТРОФА', big: 'МЕТЕОРИТЫ', color: 'danger' }),

  // ---------- Блок 6. Способности ----------
  full('abilityGrid', 392.2, 401.3),
  clip(403.99, 421.6, [
    { at: 403.99, file: '15_ability_dash.mp4', rate: 0.92 },
    { at: 409.4, file: '15_ability_dash.mp4', from: 1.3, rate: 0.75 },
    { at: 414.87, file: '16_ability_decoy.mp4', rate: 0.75 },
  ]),
  over('abilityCard', 403.99, 414.87, { n: 1, name: 'Рывок', minus: [[409.57, 'светящийся след']] }),
  over('abilityCard', 414.87, 430.51, { n: 2, name: 'Приманка', minus: [[426.29, 'исчезает после удара']] }),
  full('shield', 430.51, 441.79, { flash: 436.97 }),
  over('abilityCard', 430.51, 441.79, { n: 3, name: 'Укрепление', minus: [[436.97, 'вспышка выдаёт место']] }),
  clip(441.79, 454.9, [{ at: 441.79, file: '18_ability_burrow.mp4', rate: 0.763 }]),
  over('abilityCard', 441.79, 454.9, {
    n: 4,
    name: 'Закапывание',
    minus: [[446.23, 'сверху виден холмик']],
    timer: { at: 443.91, secs: 8, dur: 8 },
  }),
  clip(464.8, 477.93, [
    { at: 464.8, file: '19_ability_slimejump.mp4', rate: 0.77 },
    { at: 472.6, file: '19_ability_slimejump.mp4', from: 2.0, rate: 0.75 },
  ]),
  over('abilityCard', 464.8, 477.93, { n: 5, name: 'Прыжок слизняка', minus: [[474.15, 'лужа слизи выдаёт тебя']] }),
  clip(477.93, 487.8, [{ at: 477.93, file: '20_ability_recall.mp4', rate: 0.81 }]),
  over('abilityCard', 477.93, 494.2, { n: 6, name: 'Обмен местами', minus: [[489.33, 'метку видят все']] }),
  clip(503.53, 511.99, [{ at: 503.53, file: '21_ability_magnet.mp4', rate: 0.83 }]),
  over('abilityCard', 500.4, 515.0, {
    n: 7,
    name: 'Магнит',
    minus: [[511.49, 'через 30 с — падаешь']],
    timer: { at: 509.59, secs: 30, dur: 2 },
  }),

  // ---------- Блок 7. Планы и медиа ----------
  clip(516.29, 519.85, [{ at: 516.29, file: '22a_final_lab_rise.mp4' }]),
  full('plans', 519.85, 529.3),
  over('twoLines', 535.93, 545.1),
  full('channels', 547.1, 567.4),
  full('split', 584.44, 588.5),

  // ---------- Блок 8. Финал ----------
  over('counter', 596.44, 601.0, { footer: { at: 597.0, text: '…продолжение следует' } }),
  over('subscribe', 598.26, 601.4),
  over('comment', 600.96, 609.34),
];

/** Акцентные наезды камеры (план, раздел 3): только эти 4. */
export const ACCENTS: readonly { from: number; to: number; scale: number; slow?: boolean }[] = [
  { from: 160.66, to: 164.8, scale: 1.15 },
  { from: 217.9, to: 223.6, scale: 1.25 },
  { from: 540.87, to: 545.1, scale: 1.3 },
  { from: 592.42, to: 597.44, scale: 1.18, slow: true },
];

/** Звуковые эффекты: [секунда исходника, звук, длительность (с) — для зацикленных/обрезаемых]. */
export type SfxName = 'pop' | 'typing' | 'click' | 'boom' | 'tick' | 'whoosh';
export const SFX: readonly (readonly [number, SfxName, number?])[] = [
  [3.14, 'pop'],
  [24.79, 'pop'],
  [25.81, 'pop'],
  [43.41, 'typing', 1.3],
  [45.95, 'typing', 1.0],
  [55.63, 'typing', 1.5],
  [66.53, 'pop'],
  [108.3, 'typing', 1.6],
  [110.9, 'click'],
  [152.86, 'boom'],
  [160.66, 'whoosh'],
  [207.1, 'pop'],
  [217.9, 'whoosh'],
  [233.6, 'typing', 1.5],
  [291.91, 'pop'],
  [357.66, 'boom'],
  [403.99, 'pop'],
  [414.87, 'pop'],
  [430.51, 'pop'],
  [441.79, 'pop'],
  [443.91, 'tick', 8],
  [464.8, 'pop'],
  [477.93, 'pop'],
  [500.59, 'pop'],
  [509.59, 'tick', 2],
  [540.87, 'whoosh'],
  [553.87, 'pop'],
  [596.44, 'pop'],
  [598.26, 'pop'],
  [599.1, 'click'],
  [600.96, 'pop'],
];
