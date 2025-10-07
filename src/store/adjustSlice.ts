import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';

// ---------------------------
// Types
// ---------------------------
export type AdjustTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  bgColor: string;
};

export const defaultAdjustTransform: AdjustTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  bgColor: '#000000',
};

export type TagPoint = {
  id: number;
  x: number;
  y: number;
  z: number;
  username: string;
  userId: string;
};

export type AdjustRecord = Record<number, {id: string; value: AdjustTransform}>;

export type AdjustState = {
  adjustByIndex: AdjustRecord;
  setAdjustTransform: (
    index: number,
    id: string,
    value: Partial<AdjustTransform>,
  ) => void;

  tagMode: boolean;
  setTagMode: (mode: boolean) => void;

  tagValuesByIndex: Record<number, {id: string; tags: TagPoint[]}>;
  addTagToIndex: (index: number, id: string, tag: TagPoint) => void;
  updateTagAtIndex: (
    index: number,
    id: string,
    tagId: number,
    patch: Partial<TagPoint>,
  ) => void;
  removeTagAtIndex: (index: number, id: string, tagId: number) => void;
  clearTagsAtIndex: (index: number, id: string) => void;

  resetAdjustState: (
    index: number,
    preset?: Partial<AdjustTransform>,
    id?: string,
  ) => void;
};

// ---------------------------
// Slice Implementation
// ---------------------------
export const createAdjustSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  AdjustState
> = set => ({
  adjustByIndex: {
    0: {
      id: '',
      value: {...defaultAdjustTransform},
    },
  },

  tagMode: false,
  tagValuesByIndex: {},

  setTagMode: mode =>
    set(state => {
      state.tagMode = mode;
    }),

  setAdjustTransform: (index, id, value) =>
    set(state => {
      if (!state.adjustByIndex[index]) {
        state.adjustByIndex[index] = {id, value: {...defaultAdjustTransform}};
      }
      state.adjustByIndex[index].id = id;
      state.adjustByIndex[index].value = {
        ...state.adjustByIndex[index].value,
        ...value,
      };
    }),

  addTagToIndex: (index, id, tag: TagPoint) =>
    set(state => {
      const existing = state.tagValuesByIndex[index];
      if (!existing) {
        state.tagValuesByIndex[index] = {id, tags: [tag]};
        return;
      }

      // ✅ Create a new array reference
      state.tagValuesByIndex[index] = {
        id,
        tags: [...existing.tags.filter(t => t.id !== tag.id), tag],
      };
    }),

  updateTagAtIndex: (index, id, tagId, patch) =>
    set(state => {
      const record = state.tagValuesByIndex[index];
      if (!record) return;
      record.id = id;
      record.tags = record.tags.map(t =>
        t.id === tagId ? {...t, ...patch} : t,
      );
    }),

  removeTagAtIndex: (index, id, tagId) =>
    set(state => {
      const record = state.tagValuesByIndex[index];
      if (!record) return;
      record.id = id;
      record.tags = record.tags.filter(t => t.id !== tagId);
    }),

  clearTagsAtIndex: (index, id) =>
    set(state => {
      state.tagValuesByIndex[index] = {id, tags: []};
    }),

  resetAdjustState: (index, preset, id) =>
    set(state => {
      state.adjustByIndex[index] = {
        id: id ?? state.adjustByIndex[index]?.id ?? '',
        value: {
          ...defaultAdjustTransform,
          ...(preset ?? {}),
        },
      };
    }),
});
