import React, {Suspense, lazy} from 'react';
import {loadSketchColorPickerLazy} from './sketchColorPickerPreload';

const Sketch = lazy(loadSketchColorPickerLazy);

type Props = {
  color: string;
  width?: number;
  onChange: (color: {hex: string}) => void;
};

export const LazySketchColorPicker = ({
  color,
  width = 300,
  onChange,
}: Props): React.JSX.Element => {
  return (
    <Suspense
      fallback={
        <div
          className="h-[220px] rounded-md border border-gray-300 bg-white/90"
          style={{width}}
        />
      }>
      <Sketch color={color} width={width} onChange={onChange} />
    </Suspense>
  );
};
