import { defineAnimation } from '../../animation';
import { HelloWorld, type HelloWorldProps } from './HelloWorld';

export default defineAnimation<HelloWorldProps>({
  id: 'hello-world',
  component: HelloWorld,
  durationInFrames: 90,
  fps: 30,
  width: 1080,
  height: 1920,
  defaultProps: {
    title: 'Привет, Remotion!',
    subtitle: 'Первая анимация в reels',
  },
});
