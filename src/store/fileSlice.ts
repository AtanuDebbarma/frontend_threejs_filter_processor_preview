import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {MediaFile} from '../types/filterTypes';

export type FileSliceType = {
  mediaFiles: MediaFile[];
  setMediaFiles: (files: MediaFile[] | []) => void;
};

export const createFileSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  FileSliceType
> = set => ({
  mediaFiles: [],
  selectedMediaIndex: 0,
  setMediaFiles: (files: MediaFile[] | []) =>
    set(state => {
      state.mediaFiles = files;
    }),
});
