import {useTextLayerGestures} from '@/hooks/useTextLayerGestures';
import type {TextGesturePointer} from '@/hooks/useTextLayerGestures';
import type {TextLayer, TextTransform} from '@/store/textSlice';
import React, {useRef} from 'react';

type Props = {
  layer: TextLayer;
  stageWidthPx: number;
  stageHeightPx: number;
  enabled: boolean;
  shrinkForTrashDrop?: boolean;
  onTransform: (transform: TextTransform) => void;
  onDragStart: () => void;
  onDrag?: (pointer: TextGesturePointer) => void;
  onDragEnd: (pointer: TextGesturePointer) => void;
  onPinchStart: () => void;
  onSelectLayer: () => void;
  children: React.ReactNode;
};

const TRASH_DROP_PREVIEW_SCALE = 0.5;

/**
 * Wraps one text layer for drag/pinch gestures (text flow only).
 * Tap-to-edit is handled inside StoryTextPill; drag/pinch blur then transform.
 */
export const TextLayerGestureSurface = ({
  layer,
  stageWidthPx,
  stageHeightPx,
  enabled,
  shrinkForTrashDrop = false,
  onTransform,
  onDragStart,
  onDrag,
  onDragEnd,
  onPinchStart,
  onSelectLayer,
  children,
}: Props): React.JSX.Element => {
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useTextLayerGestures({
    enabled: enabled && stageWidthPx > 0 && stageHeightPx > 0,
    targetRef: surfaceRef,
    transform: layer.transform,
    stageWidthPx,
    stageHeightPx,
    onTransform,
    onDragStart,
    onDrag,
    onDragEnd,
    onPinchStart,
  });

  const {x, y, scale, rotation} = layer.transform;
  const z = layer.zIndex ?? 1;
  const displayScale = shrinkForTrashDrop
    ? scale * TRASH_DROP_PREVIEW_SCALE
    : scale;

  return (
    <div
      ref={surfaceRef}
      dir="ltr"
      role="presentation"
      className="absolute inline-block w-fit max-w-none touch-none transition-transform duration-150 ease-out select-none"
      style={{
        left: `${(0.5 + x) * 100}%`,
        top: `${(0.5 - y) * 100}%`,
        transform: `translate(-50%, -50%) scale(${displayScale}) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        direction: 'ltr',
        touchAction: 'none',
        pointerEvents: 'auto',
        zIndex: z,
      }}
      onPointerDown={e => {
        e.stopPropagation();
        onSelectLayer();
      }}>
      {children}
    </div>
  );
};
