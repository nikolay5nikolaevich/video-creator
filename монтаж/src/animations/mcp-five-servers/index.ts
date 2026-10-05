import { defineAnimation } from '../../animation';
import { McpFiveServers } from './McpFiveServers';
import { LAYOUT, TOTAL_FRAMES } from './servers';

export default defineAnimation({
  id: 'mcp-five-servers',
  component: McpFiveServers,
  durationInFrames: TOTAL_FRAMES,
  fps: 30,
  width: LAYOUT.canvasWidth,
  height: LAYOUT.canvasHeight,
});
