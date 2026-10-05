import { staticFile } from 'remotion';

/**
 * Путь к внешнему ассету бролла в `public/assets/<slug>/<file>`.
 *
 * Конвенция: на каждый бролл — своя подпапка, имя совпадает со slug
 * композиции (`<slug>-<NN>-<mode>`). Файлы туда кладёт пользователь
 * (AI-генерация / скачанные клипы, фото, прозрачные оверлеи).
 *
 * @example
 *   <AssetVideo src={asset('claude-free-03-full', 'overlay.webm')} transparent />
 */
export const asset = (slug: string, file: string): string =>
  staticFile(`assets/${slug}/${file}`);

/**
 * Путь к переиспользуемому исходнику из общей библиотеки
 * `public/library/<path>` (логотипы брендов/инструментов и пр.).
 *
 * В отличие от {@link asset}, который привязан к папке одного бролла,
 * библиотека — единый источник правды для материалов, нужных в нескольких
 * композициях (и под рукой у монтажёра). Сами файлы коммитятся в репозиторий;
 * происхождение каждого описано в `public/library/manifest.json`.
 *
 * @example
 *   <Img src={lib('logos/anthropic/claude-logo.png')} />
 *   <AssetImage src={lib('logos/google/gemini.png')} fit="contain" />
 */
export const lib = (path: string): string => staticFile(`library/${path}`);
