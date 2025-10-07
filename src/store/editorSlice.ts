import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {ColorBalance} from '../types/filterTypes';

// ---------------------------
// Types
// ---------------------------
export type EditorValue = {
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

export const defaultEditor: EditorValue = {
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

export type EditorRecord = Record<number, {id: string; value: EditorValue}>;

export type EditorState = {
  editorByIndex: EditorRecord;

  setBrightness: (index: number, id: string, value: number) => void;
  setContrast: (index: number, id: string, value: number) => void;
  setSaturation: (index: number, id: string, value: number) => void;
  setGamma: (index: number, id: string, value: number) => void;
  setHue: (index: number, id: string, value: number) => void;
  setColorBalance: (index: number, id: string, value: ColorBalance) => void;
  setSharpness: (index: number, id: string, value: number) => void;
  setShadows: (index: number, id: string, value: number) => void;
  setHighlights: (index: number, id: string, value: number) => void;
  setTemperature: (index: number, id: string, value: number) => void;
  setBlur: (index: number, id: string, value: number) => void;

  resetEditorState: (
    index: number,
    presetParams?: Partial<EditorValue>,
    id?: string,
  ) => void;
};

// ---------------------------
// Slice Implementation
// ---------------------------
export const createEditorSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  EditorState
> = set => ({
  editorByIndex: {
    0: {
      id: '',
      value: {...defaultEditor},
    },
  },

  setBrightness: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.brightness = value;
    }),

  setContrast: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.contrast = value;
    }),

  setSaturation: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.saturation = value;
    }),

  setGamma: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.gamma = value;
    }),

  setHue: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.hue = value;
    }),

  setColorBalance: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.colorBalance = value;
    }),

  setSharpness: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.sharpness = value;
    }),

  setShadows: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.shadows = value;
    }),

  setHighlights: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.highlights = value;
    }),

  setTemperature: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.temperature = value;
    }),

  setBlur: (index, id, value) =>
    set(state => {
      if (!state.editorByIndex[index]) {
        state.editorByIndex[index] = {id, value: {...defaultEditor}};
      }
      state.editorByIndex[index].id = id;
      state.editorByIndex[index].value.blur = value;
    }),

  resetEditorState: (index, presetParams, id) =>
    set(state => {
      state.editorByIndex[index] = {
        id: id ?? state.editorByIndex[index]?.id ?? '',
        value: {
          ...defaultEditor,
          ...(presetParams ?? {}),
        },
      };
    }),
});
