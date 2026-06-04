import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {MediaFile} from '@/shared/types/filterTypes';
import type {PostExportItem} from '@/features/post/types/exportTypes';
import {defaultEditor} from './editorSlice';
import {defaultAdjustTransform} from './adjustSlice';

export type VideoPlaybackTimeEntry = {
  id: string;
  currentTime: number;
};

export type FileSliceType = {
  mediaFiles: MediaFile[];
  activeIndex: number;
  setMediaFiles: (files: MediaFile[]) => void;
  thumbCache: Map<number, string>;
  setThumbCache: (index: number, uri: string) => void;
  /** Last known playback position (seconds) per slide index — videos only. */
  videoPlaybackTimeByIndex: Record<number, VideoPlaybackTimeEntry>;
  setVideoPlaybackTime: (
    index: number,
    mediaId: string,
    currentTime: number,
  ) => void;
  setActiveIndex: (index: number) => void;
  resetCache: () => void;
  videoMutedState: Record<number, {id: string; muted: boolean}>;
  setVideoMutedState: (index: number, id: string, muted: boolean) => void;
  dpr: number | null;
  setDpr: (dpr: number) => void;
  isSaveExporting: boolean;
  setIsSaveExporting: (exporting: boolean) => void;
  postUploadEndpointUrl: string | null;
  setPostUploadEndpointUrl: (url: string | null) => void;
  isPostExporting: boolean;
  setIsPostExporting: (exporting: boolean) => void;
  postExportFileCount: number;
  postExportItems: PostExportItem[];
  postExportCancelRequested: boolean;
  setPostExportConfig: (fileCount: number, items: PostExportItem[]) => void;
  setPostExportCancelRequested: (cancel: boolean) => void;
  resetPostExport: () => void;
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
  videoPlaybackTimeByIndex: {},
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
  postUploadEndpointUrl: null,
  setPostUploadEndpointUrl: url =>
    set(state => {
      state.postUploadEndpointUrl = url;
    }),
  isPostExporting: false,
  setIsPostExporting: exporting =>
    set(state => {
      state.isPostExporting = exporting;
    }),
  postExportFileCount: 0,
  postExportItems: [],
  postExportCancelRequested: false,
  setPostExportConfig: (fileCount, items) =>
    set(state => {
      state.postExportFileCount = fileCount;
      state.postExportItems = items;
      state.postExportCancelRequested = false;
    }),
  setPostExportCancelRequested: cancel =>
    set(state => {
      state.postExportCancelRequested = cancel;
    }),
  resetPostExport: () =>
    set(state => {
      state.isPostExporting = false;
      state.postExportFileCount = 0;
      state.postExportItems = [];
      state.postExportCancelRequested = false;
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
        state.textEditorByIndex[index] = {
          id: file.id,
          layers: [],
          activeLayerId: null,
          focusedTextLayerId: null,
        };
      });

      const newMutedState: Record<number, {id: string; muted: boolean}> = {};
      const newPlaybackTimes: Record<number, VideoPlaybackTimeEntry> = {};
      files.forEach((file, index) => {
        if (file.mediaType === 'video') {
          newMutedState[index] = {id: file.id, muted: false};
          newPlaybackTimes[index] = {id: file.id, currentTime: 0};
        }
      });
      state.videoMutedState = newMutedState;
      state.videoPlaybackTimeByIndex = newPlaybackTimes;
    }),

  setVideoPlaybackTime: (index, mediaId, currentTime) =>
    set(state => {
      if (!Number.isFinite(currentTime) || currentTime < 0) return;
      state.videoPlaybackTimeByIndex[index] = {
        id: mediaId,
        currentTime,
      };
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
    set({thumbCache: new Map(), videoPlaybackTimeByIndex: {}});
  },
  setVideoMutedState: (index, id, muted) =>
    set(state => {
      state.videoMutedState[index] = {id, muted};
    }),
});
