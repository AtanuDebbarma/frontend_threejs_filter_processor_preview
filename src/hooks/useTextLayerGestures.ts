import {
  stageDragOffsetFromNormalizedXY,
  textTransformFromDragOffset,
  textTransformFromPinchOffset,
} from '@/helpers/textLayerGestureCoords';
import type {TextTransform} from '@/store/textSlice';
import {useGesture} from '@use-gesture/react';
import {useLayoutEffect, useRef, type RefObject} from 'react';

export type TextGesturePointer = {
  clientX: number;
  clientY: number;
};

type Args = {
  enabled: boolean;
  targetRef: RefObject<HTMLElement | null>;
  transform: TextTransform;
  stageWidthPx: number;
  stageHeightPx: number;
  onTransform: (next: TextTransform) => void;
  onDragStart?: () => void;
  onDrag?: (pointer: TextGesturePointer) => void;
  onDragEnd?: (pointer: TextGesturePointer) => void;
  onPinchStart?: () => void;
};

const pointerFromEvent = (event: Event): TextGesturePointer => {
  if (!('clientX' in event) || !('clientY' in event)) {
    return {clientX: 0, clientY: 0};
  }

  const {clientX, clientY} = event as Event & {
    clientX: unknown;
    clientY: unknown;
  };

  if (typeof clientX === 'number' && typeof clientY === 'number') {
    return {clientX, clientY};
  }

  return {clientX: 0, clientY: 0};
};

/**
 * Per-layer drag (pan) + pinch (scale/rotate) inside the text overlay stage.
 * Trash UI is tied to drag callbacks only (not pinch).
 */
export const useTextLayerGestures = ({
  enabled,
  targetRef,
  transform,
  stageWidthPx,
  stageHeightPx,
  onTransform,
  onDragStart,
  onDrag,
  onDragEnd,
  onPinchStart,
}: Args): void => {
  const transformRef = useRef(transform);
  const stageWRef = useRef(stageWidthPx);
  const stageHRef = useRef(stageHeightPx);

  useLayoutEffect(() => {
    transformRef.current = transform;
    stageWRef.current = stageWidthPx;
    stageHRef.current = stageHeightPx;
  }, [transform, stageWidthPx, stageHeightPx]);

  useGesture(
    {
      onDragStart: () => {
        onDragStart?.();
      },
      onDrag: ({offset: [px, py], event}) => {
        onTransform(
          textTransformFromDragOffset(
            transformRef.current,
            px,
            py,
            stageWRef.current,
            stageHRef.current,
          ),
        );
        onDrag?.(pointerFromEvent(event));
      },
      onDragEnd: ({event}) => {
        onDragEnd?.(pointerFromEvent(event));
      },
      onPinchStart: () => {
        onPinchStart?.();
      },
      onPinch: ({offset: [scale, rotation]}) => {
        onTransform(
          textTransformFromPinchOffset(transformRef.current, scale, rotation),
        );
      },
    },
    {
      target: targetRef,
      enabled,
      eventOptions: {passive: false},
      drag: {
        from: () =>
          stageDragOffsetFromNormalizedXY(
            transformRef.current.x,
            transformRef.current.y,
            stageWRef.current,
            stageHRef.current,
          ),
        filterTaps: true,
      },
      pinch: {
        from: () => [transformRef.current.scale, transformRef.current.rotation],
        scaleBounds: {min: 0.5, max: 5},
        rubberband: true,
      },
    },
  );
};
