// src/helpers/editor_helpers.ts
import type {EditorFilter} from '@/assets/filters/editorData';

/*
 * Slider Binding Types
 *
 */
export type SliderBinding = {
  value: number; // UI value in 0–10 range (rounded to 2 decimals for smooth display)
  min: number; // always 0
  max: number; // always 10
  step: number; // 0.01 for smoothness
  onChange: (val: number) => void; // slider → store (native FFmpeg)
};

/*
 * Native FFmpeg parameter ranges
 *
 */
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

const round2 = (val: number) => Math.round(val * 100) / 100;

/**
 * Maps a native FFmpeg parameter value to a slider value in the range of 0–10.
 * This is a UI-only function, and is not used in the FFmpeg pipeline.
 *
 * @param key The key of the parameter to map (e.g. 'brightness', 'contrast', etc.)
 * @param val The native FFmpeg parameter value to map.
 * @returns The mapped slider value in the range of 0–10.
 */
const valueToSlider = (key: string, val: number): number => {
  const range = PARAM_RANGES[key];
  if (!range) return 0;

  // Clamp into valid FFmpeg range
  const clamped = Math.min(Math.max(val, range.min), range.max);

  // Scale to 0–10
  const scaled = ((clamped - range.min) / (range.max - range.min)) * 10;

  // UI only: round for slider smoothness
  return round2(scaled);
};

/**
 * Maps a slider value in the range of 0–10 back into a native FFmpeg parameter value.
 * This is a UI-only function, and is not used in the FFmpeg pipeline.
 *
 * @param key The key of the parameter to map (e.g. 'brightness', 'contrast', etc.)
 * @param sliderVal The slider value to map, in the range of 0–10.
 * @returns The mapped native FFmpeg parameter value, without rounding.
 */

const sliderToValue = (key: string, sliderVal: number): number => {
  const range = PARAM_RANGES[key];
  if (!range) return 0;

  // Map back into FFmpeg range
  const raw = (sliderVal / 10) * (range.max - range.min) + range.min;

  // Keep full precision in store (no rounding here)
  return raw;
};

/**
 * Returns a SliderBinding object for the given editor filter key and index.
 * The binding object contains the current value of the filter, as well as
 * a function to update the filter value when the slider changes.
 *
 * @param key The key of the editor filter to bind (e.g. 'brightness', 'contrast', etc.).
 * @param index The index of the filter to bind.
 * @param values A record containing the current values of all editor filters.
 * @param setters A record containing functions to update the values of all editor filters.
 * @returns A SliderBinding object containing the current value of the filter, as well as
 * a function to update the filter value when the slider changes.
 */
export function getEditorSliderBinding(
  key: EditorFilter['key'],
  index: number,
  values: Record<string, number>,
  setters: Record<string, (index: number, id: string, val: number) => void>,
  id: string,
): SliderBinding {
  if (!(key in PARAM_RANGES)) {
    return {value: 0, min: 0, max: 10, step: 0.01, onChange: () => {}};
  }

  const rawValue = values[key] ?? 0;

  return {
    value: valueToSlider(key, rawValue), // UI-friendly rounded value
    min: 0,
    max: 10,
    step: 0.01,
    onChange: sliderVal => {
      const val = sliderToValue(key, sliderVal); // convert back to native FFmpeg
      setters[key](index, id, val); // store precise native float
    },
  };
}

/*
 * --------------------
 * Color Balance (RGB)
 * --------------------
 */
export type ColorBalanceBinding = {
  values: {r: number; g: number; b: number}; // UI scale (0–10), rounded
  min: number;
  max: number;
  step: number;
  setValue: (channel: 'r' | 'g' | 'b', val: number) => void;
};

const COLOR_BALANCE_RANGE = 0.5; // native range: -0.5 → 0.5

/**
 * Maps a native color balance value (in the range of -0.5 → 0.5) to a UI-friendly
 * slider value in the range of 0 → 10.
 *
 * @param val The native color balance value to map (or undefined, in which case 0 is returned).
 * @returns The mapped slider value.
 */
const toSlider = (val: number | undefined): number => {
  const clamped = Math.min(
    Math.max(val ?? 0, -COLOR_BALANCE_RANGE),
    COLOR_BALANCE_RANGE,
  );
  return round2(
    ((clamped + COLOR_BALANCE_RANGE) / (2 * COLOR_BALANCE_RANGE)) * 10,
  );
};

// UI → Native (-0.5 → 0.5)
const fromSlider = (val: number): number => {
  const raw = (val / 10) * (2 * COLOR_BALANCE_RANGE) - COLOR_BALANCE_RANGE;
  return raw; // no rounding: keep native precision
};

/**
 * Returns a ColorBalanceBinding object for a given color balance object.
 *
 * @param colorBalance The color balance object to bind, with properties 'r', 'g', and 'b' representing the color balance values.
 * @param index The index of the filter in the editor.
 * @param setColorBalance A callback function that will be called when the color balance value changes.
 * @returns A ColorBalanceBinding object containing the UI-friendly color balance values and a function to set the value.
 */
export function getColorBalanceBinding(
  colorBalance: {r: number; g: number; b: number},
  index: number,
  setColorBalance: (
    index: number,
    id: string,
    val: {r: number; g: number; b: number},
  ) => void,
  id: string,
): ColorBalanceBinding {
  const setValue = (channel: 'r' | 'g' | 'b', sliderVal: number) => {
    const newVal = fromSlider(sliderVal);
    setColorBalance(index, id, {
      ...colorBalance,
      [channel]: newVal, // precise float
    });
  };

  return {
    values: {
      r: toSlider(colorBalance.r),
      g: toSlider(colorBalance.g),
      b: toSlider(colorBalance.b),
    },
    min: 0,
    max: 10,
    step: 0.01,
    setValue,
  };
}

export const inlineStyle = `
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            cursor: pointer;
          }

          input[type="range"]::-webkit-slider-track {
            background: #e5e7eb;
            height: 6px;
            border-radius: 3px;
          }

          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            margin-top: -5px;
            background-color: #ff4800;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }

          input[type="range"]::-moz-range-track {
            background: #e5e7eb;
            height: 6px;
            border-radius: 3px;
          }

          input[type="range"]::-moz-range-thumb {
            background-color: #ff4800;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }

          input[type="range"]::-moz-range-progress {
            background-color: #ff4800;
            height: 6px;
            border-radius: 3px;
          }

          input[type="range"]::-webkit-slider-runnable-track {
            background: linear-gradient(to right, #ff4800 0%, #ff4800 var(--value), #e5e7eb var(--value), #e5e7eb 100%);
            height: 6px;
            border-radius: 3px;
          }
        `;
