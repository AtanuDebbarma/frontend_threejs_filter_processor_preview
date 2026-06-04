import type {FontStyleLabel} from '@/assets/fonts/fontStyles';
import {DEFAULT_FONT_STYLE_LABEL} from '@/assets/fonts/fontStyles';
import {
  DEFAULT_TEXT_BACKGROUND_COLOR,
  DEFAULT_TEXT_BACKGROUND_OPACITY,
  DEFAULT_TEXT_COLOR,
} from '@/store/textSlice';

/** Default caption styling applied when a layer is created from TextMenu. */
export const defaultNewTextLayerPatch = {
  color: DEFAULT_TEXT_COLOR,
  backgroundEnabled: true,
  backgroundColor: DEFAULT_TEXT_BACKGROUND_COLOR,
  backgroundOpacity: DEFAULT_TEXT_BACKGROUND_OPACITY,
} as const;

export const defaultNewTextLayerFontStyle: FontStyleLabel =
  DEFAULT_FONT_STYLE_LABEL;
