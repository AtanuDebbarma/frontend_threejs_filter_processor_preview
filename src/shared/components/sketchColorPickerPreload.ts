const loadSketchColorPicker = () =>
  import('@uiw/react-color-sketch').then(module => ({default: module.default}));

let sketchPickerModule: ReturnType<typeof loadSketchColorPicker> | null = null;

/** Warm the color-picker chunk before the user opens it (Adjust / Text flows). */
export const preloadSketchColorPicker = (): void => {
  sketchPickerModule ??= loadSketchColorPicker();
};

export const loadSketchColorPickerLazy = () =>
  sketchPickerModule ?? loadSketchColorPicker();
