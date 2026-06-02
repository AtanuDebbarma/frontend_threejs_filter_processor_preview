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
  // Track active gesture type so drag and pinch never run simultaneously
  const activeGestureRef = useRef<'drag' | 'pinch' | null>(null);

  useLayoutEffect(() => {
    transformRef.current = transform;
    stageWRef.current = stageWidthPx;
    stageHRef.current = stageHeightPx;
  }, [transform, stageWidthPx, stageHeightPx]);

  useGesture(
    {
      onDragStart: ({touches}) => {
        // Only start drag when exactly 1 touch — let pinch own 2-finger sequences
        if (touches > 1) return;
        if (activeGestureRef.current === 'pinch') return;
        activeGestureRef.current = 'drag';
        onDragStart?.();
      },
      onDrag: ({offset: [px, py], event, touches, cancel}) => {
        // If a second finger arrives mid-drag, cancel drag and let pinch take over
        if (touches > 1) {
          cancel();
          activeGestureRef.current = null;
          return;
        }
        if (activeGestureRef.current !== 'drag') return;
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
        if (activeGestureRef.current === 'drag') {
          activeGestureRef.current = null;
        }
        onDragEnd?.(pointerFromEvent(event));
      },
      onPinchStart: ({touches}) => {
        // Only start pinch with 2 touches
        if (touches < 2) return;
        if (activeGestureRef.current === 'drag') return;
        activeGestureRef.current = 'pinch';
        onPinchStart?.();
      },
      onPinch: ({offset: [scale, rotation]}) => {
        if (activeGestureRef.current !== 'pinch') return;
        onTransform(
          textTransformFromPinchOffset(transformRef.current, scale, rotation),
        );
      },
      onPinchEnd: () => {
        if (activeGestureRef.current === 'pinch') {
          activeGestureRef.current = null;
        }
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
        // Require meaningful movement before drag starts — prevents accidental drags on tap
        threshold: 4,
        // Only activate drag on single pointer
        pointerLength: 1,
      },
      pinch: {
        from: () => [transformRef.current.scale, transformRef.current.rotation],
        scaleBounds: {min: 0.5, max: 5},
        rubberband: true,
      },
    },
  );
};
