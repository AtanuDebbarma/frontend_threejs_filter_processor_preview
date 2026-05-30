import type {TextTransform} from '@/store/textSlice';

/** Map story-stage pixel offset to normalized center-relative x/y. */
export const normalizedXYFromStageDragOffset = (
  offsetPxX: number,
  offsetPxY: number,
  stageWidthPx: number,
  stageHeightPx: number,
): Pick<TextTransform, 'x' | 'y'> => {
  const w = Math.max(1, stageWidthPx);
  const h = Math.max(1, stageHeightPx);
  return {
    x: offsetPxX / w,
    y: -offsetPxY / h,
  };
};

/** Initial drag offset for useGesture `from` (inverse of normalized placement). */
export const stageDragOffsetFromNormalizedXY = (
  x: number,
  y: number,
  stageWidthPx: number,
  stageHeightPx: number,
): [number, number] => {
  const w = Math.max(1, stageWidthPx);
  const h = Math.max(1, stageHeightPx);
  return [x * w, -y * h];
};

export const textTransformFromDragOffset = (
  base: TextTransform,
  offsetPxX: number,
  offsetPxY: number,
  stageWidthPx: number,
  stageHeightPx: number,
): TextTransform => {
  const {x, y} = normalizedXYFromStageDragOffset(
    offsetPxX,
    offsetPxY,
    stageWidthPx,
    stageHeightPx,
  );
  return {...base, x, y};
};

export const textTransformFromPinchOffset = (
  base: TextTransform,
  scale: number,
  rotationDeg: number,
): TextTransform => ({
  ...base,
  scale,
  rotation: rotationDeg,
});
