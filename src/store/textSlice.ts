import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import {
  DEFAULT_FONT_STYLE_LABEL,
  type FontStyleLabel,
  getFontStylePreset,
} from '../assets/fonts/fontStyles';

// ---------------------------
// Types
// ---------------------------

export const MAX_TEXT_LAYERS_PER_SLIDE = 5;

/** True when another layer may be added (limit is `MAX_TEXT_LAYERS_PER_SLIDE`). */
export const canAddTextLayer = (
  slide: TextSlideState | undefined,
  attachmentId?: string,
): boolean =>
  !!slide &&
  (!attachmentId || slide.id === attachmentId) &&
  slide.layers.length < MAX_TEXT_LAYERS_PER_SLIDE;

export type TextBackgroundStyle =
  | 'pill'
  | 'box'
  | 'square'
  | 'rounded'
  | 'outlined';

export type TextAlign = 'center' | 'left' | 'right';

export type TextTransform = {
  /** Normalized -0.5..0.5 from export frame center (post 1080×1350). */
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type TextLayer = {
  id: string;
  content: string;
  fontStyleLabel: FontStyleLabel;
  underline: boolean;
  color: string;
  backgroundEnabled: boolean;
  backgroundColor: string;
  /** 0–1 */
  backgroundOpacity: number;
  backgroundStyle: TextBackgroundStyle;
  textAlign: TextAlign;
  transform: TextTransform;
  /** True only after user drag/pinch updates this layer's transform. */
  transformTouched: boolean;
  /** Stacking order among layers on the same slide (higher = in front). */
  zIndex: number;
};

export const defaultTextTransform: TextTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
};

/** Normalized placement inside 4:5 / 9:16 stage (see TextContentOverlayArea). */
export const TEXT_LAYER_INITIAL_Y = 0.32;
export const TEXT_LAYER_Y_STEP_BELOW = 0.14;
/**
 * Position limits for layer center (fraction of stage width/height from center).
 * Values > 0.5 let the pill overflow the preview box (clipped by parent), like AdjustMenu media.
 */
export const TEXT_LAYER_X_CLAMP = 1.5;
export const TEXT_LAYER_Y_MIN = -1.5;
export const TEXT_LAYER_Y_MAX = 1.5;

export const clampTextLayerTransform = (
  transform: TextTransform,
): TextTransform => ({
  ...transform,
  x: Math.max(-TEXT_LAYER_X_CLAMP, Math.min(TEXT_LAYER_X_CLAMP, transform.x)),
  y: Math.max(TEXT_LAYER_Y_MIN, Math.min(TEXT_LAYER_Y_MAX, transform.y)),
});

export const initialTextLayerTransform = (): TextTransform =>
  clampTextLayerTransform({
    ...defaultTextTransform,
    x: 0,
    y: TEXT_LAYER_INITIAL_Y,
  });

export const textLayerTransformBelow = (ref: TextLayer): TextTransform =>
  clampTextLayerTransform({
    ...ref.transform,
    x: ref.transform.x,
    y: ref.transform.y - TEXT_LAYER_Y_STEP_BELOW,
  });

/** Default story-caption look (empty pill at center until menus change it). */
export const DEFAULT_TEXT_COLOR = '#ffffff';
export const DEFAULT_TEXT_BACKGROUND_COLOR = '#000000';
export const DEFAULT_TEXT_FONT_SIZE_PX = 22;
export const DEFAULT_TEXT_BACKGROUND_OPACITY = 1;
export const DEFAULT_TEXT_ALIGN: TextAlign = 'center';

/** True when a layer has no user-visible text (whitespace / newlines only). */
export const isTextLayerContentEmpty = (content: string): boolean =>
  content.trim() === '';

/** Layers saved before `textAlign` existed. */
export const resolveTextAlign = (layer: TextLayer): TextAlign =>
  layer.textAlign === 'left'
    ? 'left'
    : layer.textAlign === 'right'
      ? 'right'
      : 'center';

export const createDefaultTextLayer = (zIndex = 1): TextLayer => ({
  id: createTextLayerId(),
  content: '',
  fontStyleLabel: DEFAULT_FONT_STYLE_LABEL,
  underline: false,
  color: DEFAULT_TEXT_COLOR,
  backgroundEnabled: true,
  backgroundColor: DEFAULT_TEXT_BACKGROUND_COLOR,
  backgroundOpacity: DEFAULT_TEXT_BACKGROUND_OPACITY,
  backgroundStyle: 'pill',
  textAlign: DEFAULT_TEXT_ALIGN,
  transform: {...defaultTextTransform},
  transformTouched: false,
  zIndex,
});

const maxLayerZIndex = (layers: TextLayer[]): number =>
  layers.reduce((max, layer) => Math.max(max, layer.zIndex ?? 0), 0);

const TRANSFORM_EPSILON = 0.0001;
const MEDIA_VISIBLE_Y_MIN = -0.5;
const MEDIA_VISIBLE_Y_MAX = 0.5;
const MULTILINE_EDGE_PADDING = 0.04;

const hasMeaningfulTransformDelta = (
  prev: TextTransform,
  next: TextTransform,
): boolean =>
  Math.abs(prev.x - next.x) > TRANSFORM_EPSILON ||
  Math.abs(prev.y - next.y) > TRANSFORM_EPSILON ||
  Math.abs(prev.scale - next.scale) > TRANSFORM_EPSILON ||
  Math.abs(prev.rotation - next.rotation) > TRANSFORM_EPSILON;

const shouldSpawnNextLayerAtDefault = (ref: TextLayer): boolean => {
  // Only user drag/pinch should trigger default spawn, not auto-placement.
  if (ref.transformTouched) return true;

  const below = textLayerTransformBelow(ref);

  // Multiline alone should not force default; only fallback when "below" would
  // approach/exceed the media frame's visible vertical bounds.
  if (ref.content.includes('\n')) {
    return (
      below.y <= MEDIA_VISIBLE_Y_MIN + MULTILINE_EDGE_PADDING ||
      below.y >= MEDIA_VISIBLE_Y_MAX - MULTILINE_EDGE_PADDING
    );
  }

  // If "below" lands on a clamp edge, prefer default so the new layer stays visible.
  return (
    below.y <= TEXT_LAYER_Y_MIN + TRANSFORM_EPSILON ||
    below.y >= TEXT_LAYER_Y_MAX - TRANSFORM_EPSILON
  );
};

const resolveNewTextLayerTransform = (ref: TextLayer | null): TextTransform => {
  if (!ref) return initialTextLayerTransform();
  if (shouldSpawnNextLayerAtDefault(ref)) return initialTextLayerTransform();
  return textLayerTransformBelow(ref);
};

export type TextSlideState = {
  /** `mediaFiles[index].id` */
  id: string;
  layers: TextLayer[];
  activeLayerId: string | null;
  /** Layer whose textarea currently has browser focus; null when none is editing. */
  focusedTextLayerId: string | null;
};

export type TextRecord = Record<number, TextSlideState>;

export type TextState = {
  textEditorByIndex: TextRecord;

  ensureTextSlide: (index: number, id: string) => void;
  addTextLayer: (index: number, id: string) => string | null;
  removeTextLayer: (index: number, id: string, layerId: string) => void;
  updateTextLayer: (
    index: number,
    id: string,
    layerId: string,
    patch: Partial<Omit<TextLayer, 'id'>>,
  ) => void;
  setTextLayerFontStyle: (
    index: number,
    id: string,
    layerId: string,
    fontStyleLabel: FontStyleLabel,
  ) => void;
  setAllTextLayersFontStyle: (
    index: number,
    id: string,
    fontStyleLabel: FontStyleLabel,
  ) => void;
  setAllTextLayersColor: (index: number, id: string, color: string) => void;
  setAllTextLayersBackgroundColor: (
    index: number,
    id: string,
    color: string,
  ) => void;
  setAllTextLayersBackgroundMode: (
    index: number,
    id: string,
    patch: Pick<TextLayer, 'backgroundEnabled' | 'backgroundStyle'>,
  ) => void;
  setActiveTextLayerId: (
    index: number,
    id: string,
    layerId: string | null,
  ) => void;
  setFocusedTextLayerId: (
    index: number,
    id: string,
    layerId: string | null,
  ) => void;
  setAllTextLayersAlign: (
    index: number,
    id: string,
    textAlign: TextAlign,
  ) => void;
  setAllTextLayersUnderline: (
    index: number,
    id: string,
    underline: boolean,
  ) => void;
  /** Removes every layer on the slide whose `content` is empty after trim. */
  pruneEmptyTextLayers: (index: number, id: string) => void;
  bringTextLayerToFront: (index: number, id: string, layerId: string) => void;
  resetTextSlide: (index: number, id?: string) => void;
  syncTextSlidesForMedia: (
    files: Array<{id: string}>,
    preserveMatchingIds?: boolean,
  ) => void;
};

// ---------------------------
// Helpers
// ---------------------------

export const createTextLayerId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptySlide = (id: string): TextSlideState => ({
  id,
  layers: [],
  activeLayerId: null,
  focusedTextLayerId: null,
});

const ensureSlide = (
  record: TextRecord,
  index: number,
  id: string,
): TextSlideState => {
  const existing = record[index];
  if (!existing || existing.id !== id) {
    record[index] = emptySlide(id);
  } else if (existing.id === '') {
    existing.id = id;
  }
  return record[index];
};

const pruneEmptyTextLayersInSlide = (slide: TextSlideState): void => {
  if (slide.layers.length === 0) return;

  const emptyIds = new Set(
    slide.layers
      .filter(layer => isTextLayerContentEmpty(layer.content))
      .map(layer => layer.id),
  );
  if (emptyIds.size === 0) return;

  slide.layers = slide.layers.filter(layer => !emptyIds.has(layer.id));

  if (slide.activeLayerId && emptyIds.has(slide.activeLayerId)) {
    slide.activeLayerId = slide.layers[slide.layers.length - 1]?.id ?? null;
  }
  if (slide.focusedTextLayerId && emptyIds.has(slide.focusedTextLayerId)) {
    slide.focusedTextLayerId = null;
  }
};

// ---------------------------
// Slice Implementation
// ---------------------------

export const createTextSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  TextState
> = set => ({
  textEditorByIndex: {
    0: emptySlide(''),
  },

  ensureTextSlide: (index, id) =>
    set(state => {
      ensureSlide(state.textEditorByIndex, index, id);
    }),

  addTextLayer: (index, id) => {
    let createdId: string | null = null;
    set(state => {
      const slide = ensureSlide(state.textEditorByIndex, index, id);
      if (slide.layers.length >= MAX_TEXT_LAYERS_PER_SLIDE) {
        return;
      }
      const nextZ = maxLayerZIndex(slide.layers) + 1;
      const layer = createDefaultTextLayer(nextZ);
      // Anchor new-layer placement to the latest created layer sequence.
      // Using activeLayerId can overlap when user re-selects an older layer,
      // then taps "Add Text" (new layer would spawn relative to that older one).
      const ref =
        slide.layers.length > 0 ? slide.layers[slide.layers.length - 1] : null;
      if (ref) {
        layer.textAlign = resolveTextAlign(ref);
      }
      layer.transform = resolveNewTextLayerTransform(ref);
      slide.layers = [...slide.layers, layer];
      slide.activeLayerId = layer.id;
      createdId = layer.id;
    });
    return createdId;
  },

  removeTextLayer: (index, id, layerId) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      slide.layers = slide.layers.filter(l => l.id !== layerId);
      if (slide.activeLayerId === layerId) {
        slide.activeLayerId = slide.layers[slide.layers.length - 1]?.id ?? null;
      }
      if (slide.focusedTextLayerId === layerId) {
        slide.focusedTextLayerId = null;
      }
    }),

  updateTextLayer: (index, id, layerId, patch) =>
    set(state => {
      const slide = ensureSlide(state.textEditorByIndex, index, id);
      const layerIndex = slide.layers.findIndex(l => l.id === layerId);
      if (layerIndex < 0) return;
      const current = slide.layers[layerIndex];
      if (patch.fontStyleLabel !== undefined) {
        if (!getFontStylePreset(patch.fontStyleLabel)) return;
      }
      const nextTransform = patch.transform
        ? {...current.transform, ...patch.transform}
        : current.transform;
      const transformTouched =
        current.transformTouched ||
        (patch.transform
          ? hasMeaningfulTransformDelta(current.transform, nextTransform)
          : false);
      slide.layers[layerIndex] = {
        ...current,
        ...patch,
        transform: nextTransform,
        transformTouched,
      };
    }),

  setTextLayerFontStyle: (index, id, layerId, fontStyleLabel) =>
    set(state => {
      if (!getFontStylePreset(fontStyleLabel)) return;
      const slide = ensureSlide(state.textEditorByIndex, index, id);
      const layer = slide.layers.find(l => l.id === layerId);
      if (!layer) return;
      layer.fontStyleLabel = fontStyleLabel;
    }),

  setAllTextLayersFontStyle: (index, id, fontStyleLabel) =>
    set(state => {
      if (!getFontStylePreset(fontStyleLabel)) return;
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      slide.layers.forEach(layer => {
        layer.fontStyleLabel = fontStyleLabel;
      });
    }),

  setAllTextLayersColor: (index, id, color) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      slide.layers.forEach(layer => {
        layer.color = color;
      });
    }),

  setAllTextLayersBackgroundColor: (index, id, color) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      slide.layers.forEach(layer => {
        layer.backgroundColor = color;
      });
    }),

  setAllTextLayersBackgroundMode: (index, id, patch) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      slide.layers.forEach(layer => {
        layer.backgroundEnabled = patch.backgroundEnabled;
        layer.backgroundStyle = patch.backgroundStyle;
      });
    }),

  setActiveTextLayerId: (index, id, layerId) =>
    set(state => {
      const slide = ensureSlide(state.textEditorByIndex, index, id);
      if (layerId === null) {
        slide.activeLayerId = null;
        return;
      }
      if (slide.layers.some(l => l.id === layerId)) {
        slide.activeLayerId = layerId;
      }
    }),

  setFocusedTextLayerId: (index, id, layerId) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      slide.focusedTextLayerId =
        layerId === null || slide.layers.some(l => l.id === layerId)
          ? layerId
          : null;
    }),

  setAllTextLayersAlign: (index, id, textAlign) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      slide.layers = slide.layers.map(layer => ({
        ...layer,
        textAlign,
      }));
    }),

  setAllTextLayersUnderline: (index, id, underline) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      slide.layers.forEach(layer => {
        layer.underline = underline;
      });
    }),

  pruneEmptyTextLayers: (index, id) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      pruneEmptyTextLayersInSlide(slide);
    }),

  bringTextLayerToFront: (index, id, layerId) =>
    set(state => {
      const slide = state.textEditorByIndex[index];
      if (!slide || slide.id !== id) return;
      const layer = slide.layers.find(l => l.id === layerId);
      if (!layer) return;
      layer.zIndex = maxLayerZIndex(slide.layers) + 1;
    }),

  resetTextSlide: (index, id) =>
    set(state => {
      state.textEditorByIndex[index] = emptySlide(
        id ?? state.textEditorByIndex[index]?.id ?? '',
      );
    }),

  syncTextSlidesForMedia: (files, preserveMatchingIds = false) =>
    set(state => {
      const next: TextRecord = {};
      files.forEach((file, index) => {
        const prev = state.textEditorByIndex[index];
        if (
          preserveMatchingIds &&
          prev?.id === file.id &&
          prev.layers.length > 0
        ) {
          next[index] = {
            id: file.id,
            layers: prev.layers,
            activeLayerId: prev.activeLayerId,
            focusedTextLayerId: prev.focusedTextLayerId ?? null,
          };
        } else {
          next[index] = emptySlide(file.id);
        }
      });
      state.textEditorByIndex = next;
    }),
});
