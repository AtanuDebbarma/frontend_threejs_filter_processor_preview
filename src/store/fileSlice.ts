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
  requestedExport: boolean;
  setRequestedExport: (requested: boolean) => void;
  requestedSave: boolean;
  setRequestedSave: (requested: boolean) => void;
};

export const createFileSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  FileSliceType
> = (set, get) => ({
  mediaFiles: [],
  videoThumbnailButton: undefined,
  activeIndex: 0,
  thumbCache: new Map(),
  requestedExport: false,
  requestedSave: false,

  setMediaFiles: (files: MediaFile[]) =>
    set(state => {
      state.mediaFiles = files;
      // Initialize editors & adjust slices immediately with IDs
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
  setRequestedExport: (requested: boolean) => {
    set(state => {
      state.requestedExport = requested;
    });
  },
  setRequestedSave: (requested: boolean) => {
    set(state => {
      state.requestedSave = requested;
    });
  },
});
