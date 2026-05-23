import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {MediaFile} from '../types/filterTypes';
import {defaultEditor} from './editorSlice';
import {defaultAdjustTransform} from './adjustSlice';

export type FileSliceType = {
  mediaFiles: MediaFile[];
  activeIndex: number;
  setMediaFiles: (files: MediaFile[]) => void;
  thumbCache: Map<number, string>;
  setThumbCache: (index: number, uri: string) => void;
  setActiveIndex: (index: number) => void;
  resetCache: () => void;
  videoMutedState: Record<number, {id: string; muted: boolean}>;
  setVideoMutedState: (index: number, id: string, muted: boolean) => void;
  dpr: number | null;
  setDpr: (dpr: number) => void;
  isSaveExporting: boolean;
  setIsSaveExporting: (exporting: boolean) => void;
};

export const createFileSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  FileSliceType
> = (set, get) => ({
  mediaFiles: [],
  activeIndex: 0,
  thumbCache: new Map(),
  videoMutedState: {},
  dpr: null,
  setDpr: (dpr: number) =>
    set(state => {
      state.dpr = dpr;
    }),
  isSaveExporting: false,
  setIsSaveExporting: exporting =>
    set(state => {
      state.isSaveExporting = exporting;
    }),

  /**
   * Initialize media files and related slice states.
   */
  setMediaFiles: (files: MediaFile[]) =>
    set(state => {
      state.mediaFiles = files;

      // Initialize related slices (editor, adjust, tag)
      files.forEach((file, index) => {
        state.editorByIndex[index] = {
          id: file.id,
          value: {...defaultEditor},
        };
        state.adjustByIndex[index] = {
          id: file.id,
          value: {...defaultAdjustTransform},
        };
        state.tagValuesByIndex[index] = {id: file.id, tags: []};
      });

      // ✅ Initialize videoMutedState for all video files
      const newMutedState: Record<number, {id: string; muted: boolean}> = {};
      files.forEach((file, index) => {
        if (file.mediaType === 'video') {
          newMutedState[index] = {id: file.id, muted: false};
        }
      });
      state.videoMutedState = newMutedState;
    }),

  setActiveIndex: (index: number) =>
    set(state => {
      state.activeIndex = index;
    }),

  setThumbCache: (index, uri) => {
    const cache = new Map(get().thumbCache);
    cache.set(index, uri);
    set({thumbCache: cache});
  },
  resetCache: () => {
    set({thumbCache: new Map()});
  },
  setVideoMutedState: (index, id, muted) =>
    set(state => {
      state.videoMutedState[index] = {id, muted};
    }),
});
