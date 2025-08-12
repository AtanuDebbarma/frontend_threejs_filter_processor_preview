import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import {v4 as uuidv4} from 'uuid'; // UUID to generate unique IDs for texts

// Define the shape of a single text overlay
export type TextItem = {
  id: string; // unique id, e.g. UUID
  mediaIndex: number; // index of media this text belongs to
  content: string; // the actual text content
  backGroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  x?: string | number;
  y?: string | number;
  zIndex?: number;
  rotation?: number;
};

// Define the slice of Zustand state for managing multiple texts
export type TextSliceType = {
  texts: TextItem[]; // array of text overlays
  setTexts: (texts: TextItem[]) => void; // replace all texts
  updateTextContent: (id: string, content: string) => void; // update text by id
  addText: (text: Omit<TextItem, 'id'>) => void; // add new text (auto-generates id)
  removeText: (id: string) => void; // remove text by id
};

// Implementation of the slice
export const createTextSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  TextSliceType
> = set => ({
  texts: [],

  setTexts: (texts: TextItem[]) =>
    set(state => {
      state.texts = texts;
    }),

  updateTextContent: (id: string, content: string) =>
    set(state => {
      const text = state.texts.find(t => t.id === id);
      if (text) {
        text.content = content;
      }
    }),

  addText: (text: Omit<TextItem, 'id'>) =>
    set(state => {
      const newText: TextItem = {
        ...text,
        id: uuidv4(), // automatically generate a unique ID
      };
      state.texts.push(newText);
    }),

  removeText: (id: string) =>
    set(state => {
      state.texts = state.texts.filter(t => t.id !== id);
    }),
});
