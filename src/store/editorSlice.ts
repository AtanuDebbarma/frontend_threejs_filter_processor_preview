import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {ColorBalance} from '../types/filterTypes';

export type EditorState = {
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  hue: number;
  colorBalance: ColorBalance;
  sharpness: number;
  shadows: number;
  highlights: number;
  temperature: number;
  blur: number;

  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setGamma: (value: number) => void;
  setHue: (value: number) => void;
  setColorBalance: (value: {r: number; g: number; b: number}) => void;
  setSharpness: (value: number) => void;
  setShadows: (value: number) => void;
  setHighlights: (value: number) => void;
  setTemperature: (value: number) => void;
  setBlur: (value: number) => void;

  resetEditorState: (presetParams?: Partial<EditorState>) => void;
};

export const createEditorSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  EditorState
> = set => ({
  brightness: 0,
  contrast: 1,
  saturation: 1,
  gamma: 1,
  hue: 0,
  colorBalance: {r: 0, g: 0, b: 0},
  sharpness: 0,
  shadows: 0,
  highlights: 0,
  temperature: 0,
  blur: 0,

  setBrightness: value =>
    set(state => {
      state.brightness = value;
    }),
  setContrast: value =>
    set(state => {
      state.contrast = value;
    }),
  setSaturation: value =>
    set(state => {
      state.saturation = value;
    }),
  setGamma: value =>
    set(state => {
      state.gamma = value;
    }),
  setHue: value =>
    set(state => {
      state.hue = value;
    }),
  setColorBalance: value =>
    set(state => {
      state.colorBalance = value;
    }),
  setSharpness: value =>
    set(state => {
      state.sharpness = value;
    }),
  setShadows: value =>
    set(state => {
      state.shadows = value;
    }),
  setHighlights: value =>
    set(state => {
      state.highlights = value;
    }),
  setTemperature: value =>
    set(state => {
      state.temperature = value;
    }),
  setBlur: value =>
    set(state => {
      state.blur = value;
    }),

  resetEditorState: (presetParams = {}) =>
    set(state => {
      state.brightness = presetParams.brightness ?? 0;
      state.contrast = presetParams.contrast ?? 1;
      state.saturation = presetParams.saturation ?? 1;
      state.gamma = presetParams.gamma ?? 1;
      state.hue = presetParams.hue ?? 0;
      state.colorBalance = presetParams.colorBalance ?? {r: 0, g: 0, b: 0};
      state.sharpness = presetParams.sharpness ?? 0;
      state.shadows = presetParams.shadows ?? 0;
      state.highlights = presetParams.highlights ?? 0;
      state.temperature = presetParams.temperature ?? 0;
      state.blur = presetParams.blur ?? 0;
    }),
});
