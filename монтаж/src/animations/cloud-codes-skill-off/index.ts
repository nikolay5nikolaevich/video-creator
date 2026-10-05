import { defineAnimation } from '../../animation';
import { CloudCodesSkillOff } from './CloudCodesSkillOff';
import { LAYOUT, SKILLS, TIMING } from './skills';

const framesForCursor =
  TIMING.cursorStart +
  SKILLS.length * (TIMING.transitionFrames + TIMING.dwellFrames) +
  20;

export default defineAnimation({
  id: 'cloud-codes-skill-off',
  component: CloudCodesSkillOff,
  durationInFrames: framesForCursor,
  fps: 30,
  width: LAYOUT.canvasWidth,
  height: LAYOUT.canvasHeight,
});
