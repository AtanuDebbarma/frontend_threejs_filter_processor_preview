import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {ColorBalance} from '../types/filterTypes';

export type EditorState = {
  // Change from single values to per-media map
  editorValues: Record<string, MediaEditorValues>; // key = media.id
  activeMediaId: string | null;

  setEditorValue: <K extends keyof MediaEditorValues>(
    mediaId: string,
    param: K,
    value: MediaEditorValues[K],
  ) => void;

  setEditorValues: (
    mediaId: string,
    values: Partial<MediaEditorValues>,
  ) => void;
  resetEditorForMedia: (
    mediaId: string,
    presetParams?: Partial<MediaEditorValues>,
  ) => void;
  resetAllEditors: () => void;

  setActiveMediaId: (mediaId: string | null) => void;
};

export type MediaEditorValues = {
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
};

export const createEditorSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  EditorState
> = set => ({
  editorValues: {},
  activeMediaId: null,

  setEditorValue: (mediaId, param, value) =>
    set(state => {
      if (!state.editorValues[mediaId]) {
        state.editorValues[mediaId] = getDefaultEditorValues();
      }
      state.editorValues[mediaId][param] = value;
    }),

  setEditorValues: (mediaId, values) =>
    set(state => {
      if (!state.editorValues[mediaId]) {
        state.editorValues[mediaId] = getDefaultEditorValues();
      }
      Object.assign(state.editorValues[mediaId], values);
    }),

  resetEditorForMedia: (mediaId, presetParams = {}) =>
    set(state => {
      state.editorValues[mediaId] = {
        brightness: presetParams.brightness ?? 0.0,
        contrast: presetParams.contrast ?? 1.1,
        saturation: presetParams.saturation ?? 1.1,
        gamma: presetParams.gamma ?? 1.1,
        hue: presetParams.hue ?? 0.0,
        colorBalance: presetParams.colorBalance ?? {r: 0.0, g: 0.0, b: 0.0},
        sharpness: presetParams.sharpness ?? 0.0,
        shadows: presetParams.shadows ?? 0.0,
        highlights: presetParams.highlights ?? 0.0,
        temperature: presetParams.temperature ?? 0.0,
        blur: presetParams.blur ?? 0.0,
      };
    }),

  resetAllEditors: () =>
    set(state => {
      state.editorValues = {};
    }),

  setActiveMediaId: mediaId =>
    set(state => {
      state.activeMediaId = mediaId;
    }),
});

export function getDefaultEditorValues(): MediaEditorValues {
  return {
    brightness: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    gamma: 1.0,
    hue: 0.0,
    colorBalance: {r: 0.0, g: 0.0, b: 0.0},
    sharpness: 0.0,
    shadows: 0.0,
    highlights: 0.0,
    temperature: 0.0,
    blur: 0.0,
  };
}
