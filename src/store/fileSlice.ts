import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {MediaFile} from '../types/filterTypes';

export type FileSliceType = {
  mediaFiles: MediaFile[];
  selectedMediaIndex: number;
  setMediaFiles: (files: MediaFile[]) => void;
  setSelectedMediaIndex: (index: number) => void;
  videoThumbnailButton?: string;
  setVideoThumbnailButton: (thumbnail: string | undefined) => void;
};

export const createFileSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  FileSliceType
> = set => ({
  mediaFiles: [],
  selectedMediaIndex: 0,
  videoThumbnailButton: undefined,

  setMediaFiles: (files: MediaFile[]) =>
    set(state => {
      state.mediaFiles = files;
    }),
  setVideoThumbnailButton: thumbnail =>
    set(state => {
      state.videoThumbnailButton = thumbnail;
    }),

  setSelectedMediaIndex: index => set({selectedMediaIndex: index}),
});
