import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createFileSlice, type FileSliceType} from './fileSlice';
import {createButtonSlice, type ButtonSliceType} from './buttonSlices';
import {createFilterSlice, type FilterSliceType} from './filterSlice';
import {createEditorSlice, type EditorState} from './editorSlice';
import {createAdjustSlice, type AdjustState} from './adjustSlice';
import {createTextSlice, type TextState} from './textSlice';

export type AppState = FileSliceType &
  ButtonSliceType &
  FilterSliceType &
  EditorState &
  AdjustState &
  TextState;

export const appStore = create<AppState>()(
  immer((...store) => ({
    ...createFileSlice(...store),
    ...createButtonSlice(...store),
    ...createFilterSlice(...store),
    ...createEditorSlice(...store),
    ...createAdjustSlice(...store),
    ...createTextSlice(...store),
  })),
);
