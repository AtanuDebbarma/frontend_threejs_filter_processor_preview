import {
  defaultAdjustTransform,
  type AdjustTransform,
} from '../store/adjustSlice';

/** Pixel-space preview transform (matches AdjustMenu local `position` + scale + rotation). */
export type AdjustPreviewMediaTransform = {
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  bgColor: string;
};

export const adjustValueToPreviewTransform = (
  value: AdjustTransform | undefined,
  mediaWidth: number,
  mediaHeight: number,
): AdjustPreviewMediaTransform => {
  const v = value ?? defaultAdjustTransform;
  return {
    positionX: (v.x ?? 0) * mediaWidth,
    positionY: (v.y ?? 0) * mediaHeight,
    scale: v.scale ?? 1,
    rotation: v.rotation ?? 0,
    bgColor: v.bgColor ?? defaultAdjustTransform.bgColor,
  };
};
