//src/store
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createFileSlice, type FileSliceType} from './fileSlice';
import {type FilterSliceType, createFilterSlice} from './filterSlice';
import {createEditorSlice, type EditorState} from './editorSlice';

export type AppState = FileSliceType & FilterSliceType & EditorState;

export const appStore = create<AppState>()(
  immer((...store) => ({
    ...createFileSlice(...store),
    ...createFilterSlice(...store),
    ...createEditorSlice(...store),
  })),
);
