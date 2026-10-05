# Visual archetypes for educational reels

Каталог визуальных паттернов для motion-graphics сцен. Выбирай архетип по **форме высказывания**, не по теме. Повтор архетипа в соседних сценах допустим, если ритм его держит.

Для каждого архетипа: где подходит, что видит зритель, и сниппет с ключевым паттерном анимации. Сниппеты предполагают:

```ts
import { interpolate, spring, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence } from 'remotion';
```

---

## 1. key-statement

**Когда подходит**: один сильный тезис, хук, ключевое слово. Хук в начале рилза почти всегда такой.

**Что видит зритель**: огромная типографика на 1–2 строки, scale-in через spring, опционально акцентная линия/подчёркивание под текстом.

```tsx
const scale = spring({ frame, fps, config: { damping: 12, stiffness: 120 }, durationInFrames: 20 });
const accent = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

return (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
    <div style={{ transform: `scale(${scale})`, fontSize: 180, fontWeight: 800, color: 'white', letterSpacing: -4 }}>
      3 причины
    </div>
    <div style={{ marginTop: 12, height: 6, width: 240 * accent, background: '#a5b4fc', borderRadius: 3 }} />
  </AbsoluteFill>
);
```

---

## 2. bullet-stagger

**Когда подходит**: перечисление 2–5 пунктов. Списки причин, шагов, фич.

**Что видит зритель**: вертикальный или 2-колоночный стек карточек/строк, каждая появляется одна за другой со stagger'ом 6–10 кадров.

```tsx
const ITEMS = ['метаболизм', 'кожа', 'мозг'];
const STAGGER = 8;

return (
  <AbsoluteFill style={{ padding: 80, gap: 28, justifyContent: 'center', flexDirection: 'column' }}>
    {ITEMS.map((label, i) => {
      const progress = spring({
        frame: frame - i * STAGGER,
        fps,
        config: { damping: 14, stiffness: 110 },
        durationInFrames: 20,
      });
      const y = interpolate(progress, [0, 1], [40, 0]);
      return (
        <div key={label} style={{
          opacity: progress,
          transform: `translateY(${y}px)`,
          fontSize: 80,
          color: 'white',
          fontWeight: 700,
        }}>
          {i + 1}. {label}
        </div>
      );
    })}
  </AbsoluteFill>
);
```

---

## 3. before-after

**Когда подходит**: контраст двух состояний — «раньше X, теперь Y», «без этого / с этим», «плохо / хорошо».

**Что видит зритель**: split-view (вертикальный или горизонтальный), каждая половина подписана, вторая половина проявляется/слайдится после первой. Часто разные палитры у половинок.

```tsx
const leftIn = spring({ frame, fps, config: { damping: 14, stiffness: 110 }, durationInFrames: 20 });
const rightIn = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 110 }, durationInFrames: 20 });

return (
  <AbsoluteFill style={{ flexDirection: 'row' }}>
    <div style={{ flex: 1, opacity: leftIn, background: '#1e293b', alignItems: 'center', justifyContent: 'center', display: 'flex', color: '#94a3b8', fontSize: 72 }}>
      Раньше
    </div>
    <div style={{ flex: 1, opacity: rightIn, background: '#312e81', alignItems: 'center', justifyContent: 'center', display: 'flex', color: 'white', fontSize: 72 }}>
      Теперь
    </div>
  </AbsoluteFill>
);
```

---

## 4. big-number / counter

**Когда подходит**: статистика или количество — это панчлайн. «На 70% продуктивнее», «8 стаканов в день», «за 3 минуты».

**Что видит зритель**: огромная цифра, опционально count-up через interpolate от 0 до целевого значения, подпись снизу.

```tsx
const target = 8;
const value = Math.round(
  interpolate(frame, [10, 35], [0, target], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
);

return (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#050816' }}>
    <div style={{ fontSize: 360, fontWeight: 800, lineHeight: 1, color: '#a5b4fc' }}>
      {value}
    </div>
    <div style={{ fontSize: 56, color: '#e2e8f0', marginTop: 16 }}>
      стаканов в день
    </div>
  </AbsoluteFill>
);
```

---

## 5. icon-grid

**Когда подходит**: категории, примеры, «словарь» элементов, где порядок не критичен.

**Что видит зритель**: сетка 2×N или 3×N карточек/тайлов, в каждом иконка (SVG или эмодзи) и подпись, диагональный stagger.

См. `src/animations/cloud-codes-skill-off/SkillCard.tsx` — там полностью прокачанный паттерн карточки с активным состоянием, glow, и stagger через `index * stagger`.

---

## 6. callout-quote

**Когда подходит**: выделить одну фразу из сценария как цитату/афоризм — хочется «запомнить».

**Что видит зритель**: огромные кавычки, фраза в 2–4 строки, подложка-плашка или цветовой блок. Часто пара с лёгкой пульсацией подложки.

```tsx
const reveal = spring({ frame, fps, config: { damping: 16, stiffness: 90 }, durationInFrames: 25 });
const pulse = interpolate(frame % 90, [0, 45, 90], [0.85, 1, 0.85]);

return (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 120 }}>
    <div style={{ fontSize: 220, color: '#a5b4fc', opacity: 0.4, lineHeight: 0.6 }}>"</div>
    <div style={{
      transform: `scale(${0.95 + reveal * 0.05})`,
      opacity: reveal,
      padding: '24px 40px',
      background: `rgba(99,102,241,${0.15 * pulse})`,
      borderRadius: 24,
      fontSize: 72,
      fontWeight: 700,
      color: 'white',
      textAlign: 'center',
    }}>
      Вода — твой топливный бак
    </div>
  </AbsoluteFill>
);
```

---

## 7. diagram-with-arrows

**Когда подходит**: процесс (A → B → C), причинно-следственная цепочка, флоу.

**Что видит зритель**: 2–4 узла (закруглённые прямоугольники или круги), соединённые стрелками, которые «прорисовываются» по очереди. Стрелку проще всего сделать как тонкий div с `width`, растущим через `interpolate`.

```tsx
const NODES = ['Вода', 'Метаболизм', 'Энергия'];

return (
  <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, padding: 60 }}>
    {NODES.map((label, i) => {
      const nodeIn = spring({ frame: frame - i * 30, fps, durationInFrames: 18 });
      return (
        <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            opacity: nodeIn,
            transform: `scale(${0.9 + nodeIn * 0.1})`,
            padding: '24px 32px',
            background: '#312e81',
            borderRadius: 20,
            fontSize: 44,
            color: 'white',
            fontWeight: 600,
          }}>{label}</div>
          {i < NODES.length - 1 && (
            <div style={{
              width: interpolate(frame - (i * 30 + 18), [0, 14], [0, 80], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              height: 4,
              background: '#a5b4fc',
              margin: '0 12px',
            }} />
          )}
        </div>
      );
    })}
  </AbsoluteFill>
);
```

---

## 8. code-block

**Когда подходит**: технический контент — показ сниппета, «так писать НЕ надо» / «так писать надо».

**Что видит зритель**: моноширинный текст на тёмной плашке (один тон на группу токенов), строки появляются друг за другом. Без полноценного синтаксис-highlighter — достаточно 2–3 цветовых классов (keyword, string, default).

```tsx
const LINES = [
  { text: 'function fetchUser(id) {', color: '#fff' },
  { text: '  return fetch(`/api/${id}`)', color: '#a5b4fc' },
  { text: '    .then(r => r.json());', color: '#a5b4fc' },
  { text: '}', color: '#fff' },
];
const STAGGER = 12;

return (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: '#0b1026' }}>
    <div style={{
      padding: 40,
      background: '#1e1b4b',
      borderRadius: 16,
      fontFamily: '"JetBrains Mono", Menlo, monospace',
      fontSize: 36,
      lineHeight: 1.6,
    }}>
      {LINES.map((line, i) => {
        const op = interpolate(frame, [i * STAGGER, i * STAGGER + 8], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return <div key={i} style={{ opacity: op, color: line.color }}>{line.text}</div>;
      })}
    </div>
  </AbsoluteFill>
);
```

---

## 9. timeline

**Когда подходит**: последовательность событий («сначала, потом, потом»), показ длительности или прогресса.

**Что видит зритель**: горизонтальная (или вертикальная) ось с засечками и подписями; точка прогресса или заполненный сегмент движется по ней через interpolate.

---

## 10. comparison-table

**Когда подходит**: сравнение двух опций side-by-side («X vs Y»), pros/cons, фича-матрица.

**Что видит зритель**: две колонки с заголовками-чипами, под ними строки пунктов; вторая колонка проявляется после первой — это превращает «параллельный список» в «сравнение».

---

## Combining archetypes

Типичный скелет рилза: **[key-statement хук] → [bullet-stagger или icon-grid тело] → [callout-quote или big-number панчлайн]**. Это нормальный default, когда не можешь решить.

Если две соседние сцены просят один архетип — варьируй один параметр (другой акцентный цвет, другая ось layout'а, spring entry vs fade entry), чтобы глаз не утомился.
