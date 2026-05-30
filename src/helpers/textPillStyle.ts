import type {CSSProperties} from 'react';
import type {TextLayer} from '@/store/textSlice';
import {
  DEFAULT_TEXT_BACKGROUND_COLOR,
  DEFAULT_TEXT_BACKGROUND_OPACITY,
} from '@/store/textSlice';

const expandHex = (hex: string): string | null => {
  const raw = hex.replace('#', '').trim();
  if (raw.length === 3) {
    return raw
      .split('')
      .map(c => c + c)
      .join('');
  }
  if (raw.length === 6) {
    return raw;
  }
  return null;
};

/** CSS background for per-line pills (alpha from `layer.backgroundOpacity`). */
export const hexToRgba = (hex: string, alpha: number): string => {
  const expanded = expandHex(hex);
  const a = Math.min(1, Math.max(0, alpha));
  if (!expanded) {
    return hex;
  }
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** IG display + overlay textarea (`box-decoration-break: clone`). */
export const PILL_INACTIVE_DISPLAY_PADDING = '5px 10px';
export const PILL_INACTIVE_DISPLAY_LINE_HEIGHT = 1.6;

export const pillBorderRadius = (layer: TextLayer): string =>
  layer.backgroundStyle === 'pill'
    ? '8px'
    : layer.backgroundStyle === 'rounded'
      ? '50px'
      : '0px';

/** Shared text metrics for display + overlay (wrap/line-height must match). */
export const storyTextPillTextMetrics = (
  typography: CSSProperties,
): CSSProperties => ({
  ...typography,
  /** Break only on `\n` from canvas wrap or Enter; not browser soft-wrap. */
  whiteSpace: 'pre',
  overflowWrap: 'break-word',
  wordBreak: 'normal',
  padding: PILL_INACTIVE_DISPLAY_PADDING,
  lineHeight: PILL_INACTIVE_DISPLAY_LINE_HEIGHT,
  boxSizing: 'border-box',
});

/** IG display: inline + `box-decoration-break: clone` per line. */
export const inactiveIgPillStyle = (
  layer: TextLayer,
  lineBackground: string,
  typography: CSSProperties,
): CSSProperties => ({
  ...storyTextPillTextMetrics(typography),
  display: 'inline',
  backgroundColor: lineBackground,
  borderRadius: pillBorderRadius(layer),
  boxDecorationBreak: 'clone',
  WebkitBoxDecorationBreak: 'clone',
});

/** Transparent textarea — same box as display span (100% of shrink-wrapped wrapper). */
export const storyTextPillOverlayInputStyle = (
  layer: TextLayer,
  typography: CSSProperties,
): CSSProperties => ({
  ...storyTextPillTextMetrics(typography),
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  border: 'none',
  outline: 'none',
  resize: 'none',
  overflow: 'hidden',
  backgroundColor: 'transparent',
  borderRadius: 0,
  color: 'transparent',
  caretColor: layer.color,
  WebkitTextFillColor: 'transparent',
  cursor: 'text',
});

export const resolveTextPillLineBackground = (layer: TextLayer): string => {
  if (!layer.backgroundEnabled || layer.backgroundStyle === 'outlined') {
    return 'transparent';
  }
  const color = layer.backgroundColor || DEFAULT_TEXT_BACKGROUND_COLOR;
  const opacity =
    typeof layer.backgroundOpacity === 'number' &&
    !Number.isNaN(layer.backgroundOpacity)
      ? layer.backgroundOpacity
      : DEFAULT_TEXT_BACKGROUND_OPACITY;
  return hexToRgba(color, opacity);
};
