import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createFileSlice, type FileSliceType} from './fileSlice';
import {createButtonSlice, type ButtonSliceType} from './buttonSlices';
import {createFilterSlice, type FilterSliceType} from './filterSlice';
import {createEditorSlice, type EditorState} from './editorSlice';
import {createAdjustSlice, type AdjustState} from './adjustSlice';
import {createTextSlice, type TextState} from './textSlice';
import {
  createMenuChromeSlice,
  type MenuChromeSliceType,
} from './menuChromeSlice';

export type AppState = FileSliceType &
  ButtonSliceType &
  FilterSliceType &
  EditorState &
  AdjustState &
  TextState &
  MenuChromeSliceType;

export const appStore = create<AppState>()(
  immer((...store) => ({
    ...createFileSlice(...store),
    ...createButtonSlice(...store),
    ...createFilterSlice(...store),
    ...createEditorSlice(...store),
    ...createAdjustSlice(...store),
    ...createTextSlice(...store),
    ...createMenuChromeSlice(...store),
  })),
);
