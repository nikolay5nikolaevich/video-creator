import { defineAnimation } from '../../animation';
import { LAYOUT } from '../../shared/roblox-devlog-theme';
import { TOTAL_FRAMES } from './edl';
import { RobloxDevlog } from './RobloxDevlog';

export default defineAnimation({
  id: 'roblox-devlog-01',
  component: RobloxDevlog,
  durationInFrames: TOTAL_FRAMES,
  fps: LAYOUT.fps,
  width: LAYOUT.width,
  height: LAYOUT.height,
});
