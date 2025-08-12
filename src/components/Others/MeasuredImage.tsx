import React, {useRef} from 'react';
import {useElementSize} from '../../hooks/useElementSize';

export const MeasuredImage = ({
  src,
  alt,
  className,
  onSizeChange,
}: {
  src: string;
  alt: string;
  className?: string;
  onSizeChange?: (size: {width: number; height: number}) => void;
}) => {
  const {ref, size} = useElementSize<HTMLImageElement>();
  const prevSize = useRef<{width: number; height: number} | null>(null);

  React.useEffect(() => {
    if (
      size &&
      onSizeChange &&
      (!prevSize.current ||
        prevSize.current.width !== size.width ||
        prevSize.current.height !== size.height)
    ) {
      prevSize.current = size;
      onSizeChange(size);
    }
  }, [size, onSizeChange]);

  return <img ref={ref} src={src} alt={alt} className={className} />;
};
