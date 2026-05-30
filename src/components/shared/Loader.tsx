import React from 'react';

type Props = {
  size?: number;
  color?: string;
  borderWidth?: number;
  className?: string;
};

export const Loader = ({
  size = 48,
  color = '#FF4800',
  borderWidth,
  className,
}: Props): React.JSX.Element => {
  // Keep spinner stroke visually consistent across different sizes.
  const resolvedBorderWidth =
    borderWidth ?? Math.max(1.5, Math.round(size * 0.12 * 10) / 10);

  return (
    <span
      className={`loader ${className ?? ''}`.trim()}
      style={{
        width: size,
        height: size,
        borderWidth: resolvedBorderWidth,
        borderColor: color,
        borderBottomColor: 'transparent',
      }}
    />
  );
};
