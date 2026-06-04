import {
  normalizedXYFromStageDragOffset,
  stageDragOffsetFromNormalizedXY,
} from '@/features/post/helpers/text/textLayerGestureCoords';
import type {TextGesturePointer} from '@/features/post/hooks/text/useTextLayerGestures';
import type {TextLayer, TextTransform} from '@/store/textSlice';
import {useGesture} from '@use-gesture/react';
import React, {useCallback, useEffect, useRef, useState} from 'react';

type Props = {
  layer: TextLayer;
  stageWidthPx: number;
  stageHeightPx: number;
  enabled: boolean;
  shrinkForTrashDrop?: boolean;
  /** Commit transform to store (AdjustMenu commits on Confirm; text on gesture end). */
  onCommitTransform: (transform: TextTransform) => void;
  /** Blur keyboard + prep layer when drag or pinch starts. */
  onGestureStart: (kind: 'drag' | 'pinch') => void;
  onDrag?: (pointer: TextGesturePointer) => void;
  onDragEnd: (pointer: TextGesturePointer) => void;
  /** Tap without drag — select layer for editing. */
  onTapSelect: () => void;
  children: React.ReactNode;
};

const TRASH_DROP_PREVIEW_SCALE = 0.5;

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
 * Text layer gestures — mirrors AdjustMenu media pattern:
 * local state during drag/pinch, useGesture on surface ref, no CSS transition on transform.
 */
export const TextLayerGestureSurface = ({
  layer,
  stageWidthPx,
  stageHeightPx,
  enabled,
  shrinkForTrashDrop = false,
  onCommitTransform,
  onGestureStart,
  onDrag,
  onDragEnd,
  onTapSelect,
  children,
}: Props): React.JSX.Element => {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const isGesturingRef = useRef(false);
  const gestureStartedRef = useRef(false);

  const [localX, setLocalX] = useState(layer.transform.x);
  const [localY, setLocalY] = useState(layer.transform.y);
  const [localScale, setLocalScale] = useState(layer.transform.scale);
  const [localRotation, setLocalRotation] = useState(layer.transform.rotation);

  const stageWRef = useRef(stageWidthPx);
  const stageHRef = useRef(stageHeightPx);

  useEffect(() => {
    stageWRef.current = stageWidthPx;
    stageHRef.current = stageHeightPx;
  }, [stageWidthPx, stageHeightPx]);

  // Sync from store when not gesturing (like AdjustMenu restores from adjustByIndex).
  useEffect(() => {
    if (isGesturingRef.current) return;
    setLocalX(layer.transform.x);
    setLocalY(layer.transform.y);
    setLocalScale(layer.transform.scale);
    setLocalRotation(layer.transform.rotation);
  }, [layer.transform]);

  const ensureGestureStart = useCallback(() => {
    if (gestureStartedRef.current) return;
    gestureStartedRef.current = true;
    isGesturingRef.current = true;
  }, []);

  const localRef = useRef({
    x: layer.transform.x,
    y: layer.transform.y,
    scale: layer.transform.scale,
    rotation: layer.transform.rotation,
  });

  useEffect(() => {
    if (isGesturingRef.current) return;
    localRef.current = {
      x: layer.transform.x,
      y: layer.transform.y,
      scale: layer.transform.scale,
      rotation: layer.transform.rotation,
    };
  }, [layer.transform]);

  const commitTransform = useCallback(
    (next: TextTransform) => {
      localRef.current = next;
      onCommitTransform(next);
    },
    [onCommitTransform],
  );

  const endGesture = useCallback(() => {
    isGesturingRef.current = false;
    gestureStartedRef.current = false;
    commitTransform(localRef.current);
  }, [commitTransform]);

  const gesturesEnabled = enabled && stageWidthPx > 0 && stageHeightPx > 0;

  useGesture(
    {
      onDragStart: () => {
        ensureGestureStart();
        onGestureStart('drag');
      },
      onDrag: ({offset: [px, py], event}) => {
        const {x, y} = normalizedXYFromStageDragOffset(
          px,
          py,
          stageWRef.current,
          stageHRef.current,
        );
        const next = {...localRef.current, x, y};
        localRef.current = next;
        setLocalX(x);
        setLocalY(y);
        onDrag?.(pointerFromEvent(event));
      },
      onDragEnd: ({event}) => {
        endGesture();
        onDragEnd(pointerFromEvent(event));
      },
      onPinchStart: () => {
        ensureGestureStart();
        onGestureStart('pinch');
      },
      onPinch: ({offset: [scale, rotation]}) => {
        const next = {...localRef.current, scale, rotation};
        localRef.current = next;
        setLocalScale(scale);
        setLocalRotation(rotation);
      },
      onPinchEnd: () => {
        endGesture();
      },
      onClick: () => {
        onTapSelect();
      },
    },
    {
      target: surfaceRef,
      enabled: gesturesEnabled,
      eventOptions: {passive: false},
      drag: {
        from: () =>
          stageDragOffsetFromNormalizedXY(
            localX,
            localY,
            stageWRef.current,
            stageHRef.current,
          ),
        filterTaps: true,
      },
      pinch: {
        from: () => [localScale, localRotation],
        scaleBounds: {min: 0.5, max: 5},
        rubberband: true,
      },
    },
  );

  const z = layer.zIndex ?? 1;
  const displayScale = shrinkForTrashDrop
    ? localScale * TRASH_DROP_PREVIEW_SCALE
    : localScale;

  return (
    <div
      ref={surfaceRef}
      dir="ltr"
      role="presentation"
      className="absolute inline-block w-fit max-w-none touch-none select-none"
      style={{
        left: `${(0.5 + localX) * 100}%`,
        top: `${(0.5 - localY) * 100}%`,
        transform: `translate(-50%, -50%) scale(${displayScale}) rotate(${localRotation}deg)`,
        transformOrigin: 'center center',
        direction: 'ltr',
        touchAction: 'none',
        pointerEvents: 'auto',
        zIndex: z,
      }}>
      {children}
    </div>
  );
};
