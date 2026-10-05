import { Composition, Folder } from 'remotion';
import type { AnimationConfig } from './animation';

const context = require.context('./animations', true, /^\.\/[^/]+\/index\.tsx?$/);

const animations: AnimationConfig[] = context
  .keys()
  .map((key) => {
    const mod = context(key) as { default?: AnimationConfig };
    if (!mod.default) {
      throw new Error(
        `Animation module "${key}" must have a default export created via defineAnimation().`,
      );
    }
    return mod.default;
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const ids = new Set<string>();
for (const a of animations) {
  if (ids.has(a.id)) {
    throw new Error(`Duplicate animation id: "${a.id}". Each animation must have a unique id.`);
  }
  ids.add(a.id);
}

// Папка в сайдбаре Studio = базовый slug серии. Композиции скилл именует
// `<slug>-NN` (опц. вариант-буква `08b` и режим-суффикс `-half`/`-full`/
// `-detail-half`), поэтому slug = всё ДО завершающего `-NN[вариант][-mode…]`.
// Берём ПОСЛЕДНИЙ `-NN` (жадный `.+`), иначе slug с числом внутри (напр.
// `claude-97-guide`) ошибочно обрезается на первом числе → папка «claude».
// Одиночные id без числового суффикса собираем в папку `other`.
const OTHER_FOLDER = 'other';
const folderOf = (id: string): string =>
  id.match(/^(.+)-\d{2}[a-z]?(?:-[a-z]+)*$/)?.[1] ?? OTHER_FOLDER;

const renderComposition = (a: AnimationConfig) => (
  <Composition
    key={a.id}
    id={a.id}
    component={a.component}
    durationInFrames={a.durationInFrames}
    fps={a.fps}
    width={a.width}
    height={a.height}
    defaultProps={a.defaultProps}
    // Путь экспорта по умолчанию = out/<slug>/<id>.<ext> — отдельный каталог на
    // каждое видео, как папка серии в сайдбаре. `defaultOutName` (без расширения,
    // его подставит кодек) применяется И в CLI (`remotion render`), И в Render-
    // модале веб-Studio (панель «Renders» серверного рендера), так что путь
    // совпадает везде без ручного ввода. Remotion сам создаёт подпапку.
    calculateMetadata={() => ({
      defaultOutName: `${folderOf(a.id)}/${a.id}`,
    })}
  />
);

export const RemotionRoot = () => {
  const groups = new Map<string, AnimationConfig[]>();
  for (const a of animations) {
    const folder = folderOf(a.id);
    const bucket = groups.get(folder);
    if (bucket) {
      bucket.push(a);
    } else {
      groups.set(folder, [a]);
    }
  }

  return (
    <>
      {[...groups.entries()].map(([folder, comps]) => (
        <Folder key={folder} name={folder}>
          {comps.map(renderComposition)}
        </Folder>
      ))}
    </>
  );
};
