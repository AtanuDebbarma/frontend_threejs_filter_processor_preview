import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';

export type FileSliceType = {
  mediaFiles: File[];
  selectedMediaIndex: number;
  setMediaFiles: (files: File[]) => void;
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

  setMediaFiles: (files: File[]) =>
    set(state => {
      state.mediaFiles = files;
    }),
  setVideoThumbnailButton: thumbnail =>
    set(state => {
      state.videoThumbnailButton = thumbnail;
    }),

  setSelectedMediaIndex: index => set({selectedMediaIndex: index}),
});
