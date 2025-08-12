// src/helpers/editor_helpers.ts
import type {EditorFilter} from '../assets/filters/editorData';

type SliderBinding = {
  value: number; // Slider position (0-100)
  min: number; // Slider minimum
  max: number; // Slider maximum
  onChange: (val: number) => void;
};

// Define per-parameter slider ranges for non-colorBalance parameters
const PARAM_RANGES: Record<string, {min: number; max: number}> = {
  brightness: {min: -0.5, max: 0.5},
  contrast: {min: 0, max: 3},
  saturation: {min: 0, max: 3},
  gamma: {min: 0.5, max: 3},
  hue: {min: -180, max: 180},
  sharpness: {min: 0, max: 2},
  shadows: {min: -1, max: 1},
  highlights: {min: -1, max: 1},
  temperature: {min: -100, max: 100},
  blur: {min: 0, max: 10},
};

// Converts actual value to slider scale (0-100)
const valueToSlider = (key: string, val: number) => {
  const range = PARAM_RANGES[key];
  if (!range) return 0;
  const clamped = Math.min(Math.max(val, range.min), range.max);
  return ((clamped - range.min) / (range.max - range.min)) * 100;
};

// Converts slider scale (0-100) back to actual value
const sliderToValue = (key: string, sliderVal: number) => {
  const range = PARAM_RANGES[key];
  if (!range) return 0;
  return (sliderVal / 100) * (range.max - range.min) + range.min;
};

export function getEditorSliderBinding(
  key: EditorFilter['key'],
  values: Record<string, number>,
  setters: Record<string, (val: number) => void>,
): SliderBinding {
  // Exclude colorBalance here; handled separately
  if (!(key in PARAM_RANGES)) {
    return {
      value: 0,
      min: 0,
      max: 100,
      onChange: () => {},
    };
  }
  const rawValue = values[key] ?? 0;
  return {
    value: valueToSlider(key, rawValue), // native → slider (0–100)
    min: 0,
    max: 100,
    onChange: sliderVal => {
      const val = sliderToValue(key, sliderVal); // slider (0–100) → native
      setters[key](val); // store native value in Zustand
    },
  };
}

// Separate helpers for colorBalance (RGB)

export type ColorBalanceBinding = {
  values: {r: number; g: number; b: number}; // Each in slider 0-100 scale
  setValue: (channel: 'r' | 'g' | 'b', val: number) => void; // val in slider scale 0-100
};

const COLOR_BALANCE_RANGE = 0.5; // User range -0.5 to +0.5 for each channel

export function getColorBalanceBinding(
  colorBalance: {r: number; g: number; b: number},
  setColorBalance: (val: {r: number; g: number; b: number}) => void,
): ColorBalanceBinding {
  // Helper to convert color channel value (-0.5 to 0.5) to slider 0-100
  const toSlider = (val: number | undefined) =>
    Math.round(
      (((val ?? 0) + COLOR_BALANCE_RANGE) / (2 * COLOR_BALANCE_RANGE)) * 100,
    );

  // Helper to convert slider 0-100 value back to channel range
  const fromSlider = (val: number) =>
    (val / 100) * 2 * COLOR_BALANCE_RANGE - COLOR_BALANCE_RANGE;

  const setValue = (channel: 'r' | 'g' | 'b', sliderVal: number) => {
    const newVal = fromSlider(sliderVal);
    setColorBalance({
      ...colorBalance,
      [channel]: newVal,
    });
  };

  return {
    values: {
      r: toSlider(colorBalance.r),
      g: toSlider(colorBalance.g),
      b: toSlider(colorBalance.b),
    },
    setValue,
  };
}
