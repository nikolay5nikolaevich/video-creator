# Remotion API cheatsheet

Прицельный справочник по тем API, которые реально используются в проекте `reels/`. Если нужно что-то за пределами этого файла — сходи в Remotion docs через `context7`, не угадывай сигнатуры.

## Hooks

### `useCurrentFrame(): number`

Возвращает текущий кадр. Вызывается внутри компонента, отрендеренного Remotion (компонент композиции или его потомки). Стартует с 0 на старте композиции (или `Sequence`, если хук в её детях) и инкрементится на 1 каждый кадр.

### `useVideoConfig()`

Возвращает `{ fps, width, height, durationInFrames }` для текущей композиции. Используй `fps` при расчётах для `spring` и при конвертации секунд → кадры.

## Animation primitives

### `interpolate(input, [inputRange], [outputRange], options?)`

```ts
const opacity = interpolate(frame, [10, 30], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

- `inputRange` и `outputRange` — массивы одинаковой длины, `inputRange` строго возрастает.
- **Всегда ставь `extrapolateLeft: 'clamp'` и `extrapolateRight: 'clamp'`** для значений, привязанных к диапазону кадров (вход/выход сцены) — иначе значения улетают за границы и дают мерцание/артефакты до начала и после конца.
- `easing` (в options) принимает функцию из `Easing` пакета `remotion`: `Easing.bezier(0.4, 0, 0.2, 1)`, `Easing.out(Easing.exp)`, `Easing.inOut(Easing.cubic)`.

### `spring({ frame, fps, config?, durationInFrames?, from?, to?, delay? })`

```ts
const scale = spring({
  frame,
  fps,
  config: { damping: 14, stiffness: 120, mass: 0.6 },
  durationInFrames: 20,
  from: 0,
  to: 1,
});
```

- `from` по умолчанию `0`, `to` по умолчанию `1`. Ставь явно, когда нужно что-то отличное от 0→1.
- `config`:
  - `damping` — сопротивление; выше → меньше «отскока» (12–14 для UI с лёгким bounce, 16+ почти без оверсхута).
  - `stiffness` — скорость возврата (80–180 — типичный диапазон).
  - `mass` — инерция (0.4–0.8).
- Адекватный default для UI: `{ damping: 12, stiffness: 100, mass: 0.6 }`.
- `durationInFrames` обрезает spring после N кадров — полезно, когда нужно гарантированное время settle.
- Для stagger'a одинаковых элементов — `frame: frame - index * stagger`.

## Layout

### `<AbsoluteFill style={{...}}>`

Заполняет всю композицию. Используется и как root сцены/компонента, и как слой полного экрана (фон, оверлей). Несколько вложенных/соседних `AbsoluteFill` рендерятся в порядке документа — поздние дети поверх ранних.

### `<Sequence from={N} durationInFrames={M}>`

Рендерит детей только в кадрах `[N, N+M)` родительской таймлайн. Внутри `useCurrentFrame()` возвращает кадр **относительно** `from` (0 на старте sequence). Используй для композиции сцен без ручной арифметики смещений.

```tsx
<Sequence from={0} durationInFrames={60}>
  <Hook />
</Sequence>
<Sequence from={60} durationInFrames={120}>
  <BulletList />
</Sequence>
<Sequence from={180} durationInFrames={60}>
  <Punchline />
</Sequence>
```

### `<Series>` / `<Series.Sequence durationInFrames={N}>`

Сахар над `Sequence`, когда сцены идут строго друг за другом и считать `from` вручную лень.

```tsx
<Series>
  <Series.Sequence durationInFrames={60}><Hook /></Series.Sequence>
  <Series.Sequence durationInFrames={120}><BulletList /></Series.Sequence>
  <Series.Sequence durationInFrames={60}><Punchline /></Series.Sequence>
</Series>
```

## Что в этом проекте сознательно НЕ используется

- **Framer Motion / GSAP / animejs** — нет в `package.json`, ставить без согласия не нужно.
- **Сырые `<link>` теги для шрифтов** — кастомные шрифты только через `@remotion/google-fonts` (предварительно убедись, что пакет уже стоит).
- **`delayRender` / `continueRender`** — нужны только для асинхронной загрузки данных в момент рендера, чего у нас нет.

> `staticFile` / `<Img>` / `<OffthreadVideo>` / `<Audio>` — **используются**, когда у бролла есть внешний ассет (видео, фото, прозрачный оверлей). См. раздел «Внешние ассеты» ниже и `references/external-assets.md`. Под inline-SVG/эмодзи они по-прежнему не нужны.

## Внешние ассеты (видео, фото, прозрачные оверлеи)

Когда деталь нельзя/дорого рисовать кодом (фотореализм, текстуры, отражения, органичный моушн), её берут готовым файлом — AI-генерация или скачанный клип/картинка — и кладут слоем. Файлы лежат в `public/assets/<slug>/`, доступ через хелпер `asset()` из `src/assets.ts`. Подробная конвенция и чеклист — `references/external-assets.md`.

### `staticFile(path)` / `asset(slug, file)`

```ts
import { asset } from '../../assets';
const src = asset('claude-free-03-full', 'overlay.webm'); // → public/assets/claude-free-03-full/overlay.webm
```

### `<OffthreadVideo src transparent fit volume />` — видео слоем

Предпочтительный способ встроить видео в рендер (кадры тянутся через FFmpeg, надёжнее `<Video>`). В проекте — через обёртку `src/components/AssetVideo.tsx`, не напрямую.

- **`transparent`**: `true` сохраняет alpha-канал. Поддержка только **WebM (VP8/VP9 с альфой)** или **ProRes 4444 .mov**. Кадры извлекаются как PNG → рендер чуть медленнее (норма).
- **`blend`**: CSS `mixBlendMode` — выбить монотонный фон у клипа без альфы. `'screen'` убирает чёрный фон, `'multiply'` — белый. Приближение (смешивание со слоем ниже), не настоящий кей. Детали и альтернатива через системный ffmpeg — `references/external-assets.md`.
- `volume`: 0..1, бролы обычно немые (`volume={0}`).

```tsx
import { AssetVideo } from '../../components/AssetVideo';
import { asset } from '../../assets';

// прозрачный оверлей поверх сцены
<AssetVideo src={asset('slug-03-full', 'sparks.webm')} transparent fadeIn={6} fadeOut={8} />
// непрозрачный фоновый клип
<AssetVideo src={asset('slug-03-full', 'bg.mp4')} fit="cover" />
```

### `<Img src />` + Ken Burns — фото/картинка слоем

В проекте — через `src/components/AssetImage.tsx`. Статичное фото без движения = «замершая» сцена; включай `kenBurns` (медленный zoom + pan).

```tsx
import { AssetImage } from '../../components/AssetImage';
<AssetImage src={asset('slug-03-full', 'photo.jpg')} kenBurns={{ from: 1, to: 1.12, panY: -30 }} fadeIn={6} />
```

### `<Audio src volume />` — звук (опционально)

```tsx
import { Audio } from 'remotion';
<Audio src={asset('slug-03-full', 'whoosh.mp3')} volume={0.6} />
```

### Порядок слоёв

Соседние/вложенные слои рендерятся в порядке документа (поздние — поверх). Типичный стек бролла: **фон (AssetImage/AssetVideo) → ассет → код-графика → субтитры**.

### Важно про выход

Прозрачность нужна **только у входных ассетов**. Фон композиции всегда заливает весь канвас, итоговый mp4 непрозрачен — поэтому `remotion.config.ts` (jpeg-кадры) менять не нужно.

## Константы проекта

- Канвас: **1080×1920** (вертикальные рилзы).
- FPS: **30**.
- Хук должен донести ключевой визуал в первые **45 кадров** (~1.5 с) — иначе свайпают.
- Шрифт по умолчанию: `system-ui, -apple-system, sans-serif`.

## Полезные паттерны

### Stagger одинаковых элементов

```tsx
const STAGGER = 8;
items.map((item, i) => {
  const progress = spring({
    frame: frame - i * STAGGER,
    fps,
    config: { damping: 14, stiffness: 110 },
    durationInFrames: 20,
  });
  // progress использовать в opacity/translateY/scale
});
```

### Fade-in границы сцены

```tsx
const opacity = interpolate(
  frame,
  [0, 8, durationInFrames - 10, durationInFrames],
  [0, 1, 1, 0],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
);
```

### Count-up числа

```tsx
const value = Math.round(
  interpolate(frame, [10, 35], [0, target], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }),
);
```

### Пульсирующий фон / glow

```tsx
const pulse = interpolate(frame % 120, [0, 60, 120], [0, 1, 0]);
// pulse → opacity акцентного слоя или scale glow-элемента
```
