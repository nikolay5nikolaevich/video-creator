import type { ReactNode } from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { COLORS } from '../../shared/roblox-devlog-theme';
import { ARoll } from './ARoll';
import { AROLL_FRAMES, ENDCARD_FRAMES } from './edl';
import { AbilityCard, AbilityGrid, Shield } from './scenes/Abilities';
import { AgentChat } from './scenes/AgentChat';
import { ClipLayer } from './scenes/ClipLayer';
import { Channels, Endcard, Plans, Split } from './scenes/Finale';
import { EarnCounter, HookMontage, QuestionTitle } from './scenes/Hook';
import { MiniMap } from './scenes/MiniMap';
import { Comment, Markers, Plate, Rooms, Spot, Subscribe, TitleCard, TwoLines } from './scenes/Overlays';
import { Browser, MiniChat, Roadmap, TzDoc } from './scenes/Story';
import { McpDiagram, ToolChips } from './scenes/Tools';
import { Sound } from './Sound';
import { Subtitles } from './Subtitles';
import { LAYERS, type GfxId, type Layer } from './timeline';
import { At } from './timing';

/* eslint-disable @typescript-eslint/no-explicit-any -- props слоёв описаны в timeline.ts как данные */
const GFX: Record<GfxId, (p: any) => ReactNode> = {
  question: () => <QuestionTitle />,
  counter: (p) => <EarnCounter {...p} />,
  montage: () => <HookMontage />,
  tools: () => <ToolChips />,
  mcp: () => <McpDiagram />,
  chat: () => <AgentChat />,
  plate: (p) => <Plate {...p} />,
  spot: (p) => <Spot {...p} />,
  browser: () => <Browser />,
  tzdoc: () => <TzDoc />,
  roadmap: () => <Roadmap />,
  miniChat: () => <MiniChat />,
  markers: () => <Markers />,
  title: (p) => <TitleCard {...p} />,
  rooms: (p) => <Rooms {...p} />,
  minimap: (p) => <MiniMap {...p} />,
  abilityGrid: () => <AbilityGrid />,
  abilityCard: (p) => <AbilityCard {...p} />,
  shield: (p) => <Shield {...p} />,
  plans: () => <Plans />,
  twoLines: () => <TwoLines />,
  channels: () => <Channels />,
  split: () => <Split />,
  subscribe: () => <Subscribe />,
  comment: () => <Comment />,
  endcard: () => <Endcard />,
};

const renderLayer = (l: Layer) =>
  l.kind === 'clip' ? <ClipLayer segs={l.segs} to={l.to} fx={l.fx} /> : GFX[l.id](l.props ?? {});

/**
 * Девлог №1. Таймлайн — timeline.ts по монтаж/план-монтажа.md, все времена в секундах исходника.
 * Полноэкранные слои рисуются под наложениями, субтитры — поверх всего.
 */
export const RobloxDevlog = () => {
  const ordered = [...LAYERS.filter((l) => l.full), ...LAYERS.filter((l) => !l.full)];
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <ARoll />
      {ordered.map((l) => (
        <At key={`${l.kind}-${l.from}`} from={l.from} to={l.to} name={l.kind === 'clip' ? `клип ${l.segs[0]?.file}` : l.id}>
          {renderLayer(l)}
        </At>
      ))}
      {ENDCARD_FRAMES > 0 && (
        <Sequence from={AROLL_FRAMES - 12} durationInFrames={ENDCARD_FRAMES + 12} name="Заставка">
          <Endcard />
        </Sequence>
      )}
      <Subtitles />
      <Sound />
    </AbsoluteFill>
  );
};
