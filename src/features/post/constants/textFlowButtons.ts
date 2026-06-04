import type {ButtonStateType} from '@/store/buttonSlices';

/** Keep text preview visible while any text sub-menu is open. */
export const TEXT_FLOW_BUTTONS: ReadonlySet<ButtonStateType> = new Set([
  'text',
  'fontStyle',
  'underline',
  'textBackground',
  'textColor',
  'textBackgroundColor',
]);
