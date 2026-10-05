export type Server = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

export const SERVERS: Server[] = [
  { id: 'perplexity', name: 'Perplexity', emoji: '🔎', description: 'Поиск по интернету в реальном времени' },
  { id: 'playwright', name: 'Playwright', emoji: '🎭', description: 'Полный контроль над браузером' },
  { id: 'firecrawl', name: 'Firecrawl', emoji: '🔥', description: 'Краулит сайты, грузит весь контент' },
  { id: 'glif', name: 'Glif', emoji: '🎨', description: 'Сотни AI-моделей для картинок и видео' },
  { id: 'chrome', name: 'Chrome MCP', emoji: '🌐', description: 'Уже встроен в Claude Code' },
];

export const LAYOUT = {
  canvasWidth: 1080,
  canvasHeight: 1920,
  cardWidth: 920,
  cardHeight: 240,
  cardLeft: 80,
  gridTop: 360,
  gapY: 28,
} as const;

export const SCENES = {
  hook: { from: 0, duration: 105 },
  promise: { from: 105, duration: 180 },
  diagram: { from: 285, duration: 300 },
  servers: { from: 585, duration: 750 },
  freeOss: { from: 1335, duration: 120 },
  stats: { from: 1455, duration: 210 },
} as const;

export const TOTAL_FRAMES =
  SCENES.hook.duration +
  SCENES.promise.duration +
  SCENES.diagram.duration +
  SCENES.servers.duration +
  SCENES.freeOss.duration +
  SCENES.stats.duration;

export const SERVERS_TIMING = {
  cardEntryStart: 0,
  cardEntryStagger: 6,
  cardEntryDuration: 22,
  activeSlotFrames: 150,
} as const;

export function getCardTop(index: number): number {
  return LAYOUT.gridTop + index * (LAYOUT.cardHeight + LAYOUT.gapY);
}
