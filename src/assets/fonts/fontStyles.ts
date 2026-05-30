/** Poppins presets — label matches UI in FontStyleMenu. */
export const FONT_STYLES = [
  {
    label: 'Regular',
    weight: '400',
    style: 'normal',
    file: 'Poppins-Regular.woff2',
    family: 'Poppins',
  },
  {
    label: 'Italic',
    weight: '400',
    style: 'italic',
    file: 'Poppins-Italic.woff2',
    family: 'Poppins',
  },
  {
    label: 'Light',
    weight: '300',
    style: 'normal',
    file: 'Poppins-Light.woff2',
    family: 'Poppins',
  },
  {
    label: 'Light Italic',
    weight: '300',
    style: 'italic',
    file: 'Poppins-LightItalic.woff2',
    family: 'Poppins',
  },
  {
    label: 'Medium',
    weight: '500',
    style: 'normal',
    file: 'Poppins-Medium.woff2',
    family: 'Poppins',
  },
  {
    label: 'Medium Italic',
    weight: '500',
    style: 'italic',
    file: 'Poppins-MediumItalic.woff2',
    family: 'Poppins',
  },

  {
    label: 'Dancing Regular',
    weight: '500',
    style: 'normal',
    file: 'DancingScript-Regular.woff2',
    family: 'Dancing Script',
  },
  {
    label: 'Dancing Medium',
    weight: '700',
    style: 'normal',
    file: 'DancingScript-Medium.woff2',
    family: 'Dancing Script',
  },
  {
    label: 'Dancing Bold',
    weight: '800',
    style: 'normal',
    file: 'DancingScript-Bold.woff2',
    family: 'Dancing Script',
  },
  {
    label: 'Bold',
    weight: '700',
    style: 'normal',
    file: 'Poppins-Bold.woff2',
    family: 'Poppins',
  },
  {
    label: 'Bold Italic',
    weight: '700',
    style: 'italic',
    file: 'Poppins-BoldItalic.woff2',
    family: 'Poppins',
  },
  {
    label: 'Extra Bold',
    weight: '800',
    style: 'normal',
    file: 'Poppins-ExtraBold.woff2',
    family: 'Poppins',
  },
  {
    label: 'Extra Bold Italic',
    weight: '800',
    style: 'italic',
    file: 'Poppins-ExtraBoldItalic.woff2',
    family: 'Poppins',
  },
] as const;

export type FontStyleLabel = (typeof FONT_STYLES)[number]['label'];

export type FontStylePreset = (typeof FONT_STYLES)[number];

export const DEFAULT_FONT_STYLE_LABEL: FontStyleLabel = 'Regular';

export const getFontStylePreset = (
  label: FontStyleLabel,
): FontStylePreset | undefined =>
  FONT_STYLES.find(entry => entry.label === label);
