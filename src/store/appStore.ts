import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createFileSlice, type FileSliceType} from './fileSlice';
import {type ButtonSliceType, createButtonSlice} from './buttonSlices';
import {type FilterSliceType, createFilterSlice} from './filterSlice';
import {createEditorSlice, type EditorState} from './editorSlice';
import {createTextSlice, type TextSliceType} from './textSlice';

export type AppState = FileSliceType &
  ButtonSliceType &
  FilterSliceType &
  EditorState &
  TextSliceType;

export const appStore = create<AppState>()(
  immer((...store) => ({
    ...createFileSlice(...store),
    ...createButtonSlice(...store),
    ...createFilterSlice(...store),
    ...createEditorSlice(...store),
    ...createTextSlice(...store),
  })),
);
