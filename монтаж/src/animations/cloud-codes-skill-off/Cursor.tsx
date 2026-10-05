type CursorProps = {
  x: number;
  y: number;
  pressed: boolean;
  visible: boolean;
};

export const Cursor = ({ x, y, pressed, visible }: CursorProps) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-6px, -4px) scale(${pressed ? 0.9 : 1})`,
        transition: 'none',
        filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {pressed && (
        <div
          style={{
            position: 'absolute',
            left: -24,
            top: -24,
            width: 72,
            height: 72,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(165,180,252,0.55) 0%, rgba(165,180,252,0) 70%)',
          }}
        />
      )}
      <svg width="48" height="60" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 2 2 L 2 22 L 7 18 L 10 27 L 13.5 25.5 L 10.5 17 L 17 17 Z"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
