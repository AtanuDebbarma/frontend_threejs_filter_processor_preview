import type {Insets} from '@/App';
import {adjustValueToPreviewTransform} from '@/helpers/adjustPreviewTransform';
import {AdjustPreviewFrame} from '@/components/Menus/shared/AdjustPreviewFrame';
import {appStore} from '@/store/appStore';
import {defaultAdjustTransform} from '@/store/adjustSlice';
import {initialTextLayerTransform} from '@/store/textSlice';
import type {TextLayer, TextTransform} from '@/store/textSlice';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useElementSize} from '@/hooks/useElementSize';
import {isPointerOnTrashButton} from '@/helpers/textTrashDropHitTest';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StoryTextPill, type StoryTextPillHandle} from './StoryTextPill';
import {TextLayerGestureSurface} from './TextLayerGestureSurface';

type Props = {
  post: boolean;
  safeInsets: Insets;
};

export const TextContentOverlayArea = ({
  post = true,
  safeInsets,
}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const activeButton = appStore(state => state.activeButton);
  const mediaFiles = appStore(state => state.mediaFiles);
  const isTextEditing = activeButton === 'text';
  const isTextColorMode = activeButton === 'textColor';
  const isTextBackgroundColorMode = activeButton === 'textBackgroundColor';
  const isAnyColorPickerMode = isTextColorMode || isTextBackgroundColorMode;
  const activeIndex = appStore(state => state.activeIndex);
  const textSlide = appStore(state => state.textEditorByIndex[activeIndex]);
  const setActiveTextLayerId = appStore(state => state.setActiveTextLayerId);
  const setFocusedTextLayerId = appStore(state => state.setFocusedTextLayerId);
  const removeTextLayer = appStore(state => state.removeTextLayer);
  const pruneEmptyTextLayers = appStore(state => state.pruneEmptyTextLayers);
  const bringTextLayerToFront = appStore(state => state.bringTextLayerToFront);
  const updateTextLayer = appStore(state => state.updateTextLayer);
  const adjustEntry = appStore(state => state.adjustByIndex[activeIndex]);

  const activeFile = mediaFiles[activeIndex];
  const attachmentId = activeFile?.id ?? '';
  const layers = useMemo(
    () => (textSlide?.id === attachmentId ? (textSlide.layers ?? []) : []),
    [textSlide, attachmentId],
  );
  const activeLayerId = useMemo(() => {
    if (layers.length === 0) return null;
    const activeId = textSlide?.activeLayerId;
    if (activeId && layers.some(l => l.id === activeId)) {
      return activeId;
    }
    return layers[layers.length - 1]?.id ?? null;
  }, [layers, textSlide?.activeLayerId]);
  const hasSelectedLayerForColor = useMemo(
    () => !!activeLayerId && layers.some(layer => layer.id === activeLayerId),
    [activeLayerId, layers],
  );
  const isIndividualTextColorMode =
    isAnyColorPickerMode && hasSelectedLayerForColor;
  const maxLayerZIndex = useMemo(
    () => layers.reduce((max, layer) => Math.max(max, layer.zIndex ?? 0), 0),
    [layers],
  );

  const previewTransform = useMemo(() => {
    if (!activeFile?.width || !activeFile?.height) {
      return adjustValueToPreviewTransform(defaultAdjustTransform, 1, 1);
    }
    const value =
      adjustEntry?.id === attachmentId
        ? adjustEntry.value
        : defaultAdjustTransform;
    return adjustValueToPreviewTransform(
      value,
      activeFile.width,
      activeFile.height,
    );
  }, [activeFile, adjustEntry, attachmentId]);

  const {ref: textStageRef, size: textStageSize} =
    useElementSize<HTMLDivElement>();
  const maxStageWidthPx = textStageSize?.width ?? 0;
  const maxStageHeightPx = textStageSize?.height ?? 0;

  const pillRefs = useRef<Record<string, StoryTextPillHandle | null>>({});
  const textTrashButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isTextDragActive, setIsTextDragActive] = useState(false);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [isPointerOverTrash, setIsPointerOverTrash] = useState(false);

  const closeTop = post ? 'top-8 left-7' : 'left-7 top-8';

  const dismissEmptyTextLayers = useCallback(() => {
    if (!attachmentId) return;
    pruneEmptyTextLayers(activeIndex, attachmentId);
  }, [activeIndex, attachmentId, pruneEmptyTextLayers]);

  const scheduleDismissEmptyTextLayers = useCallback(() => {
    requestAnimationFrame(() => {
      dismissEmptyTextLayers();
    });
  }, [dismissEmptyTextLayers]);

  useEffect(() => {
    if (isTextEditing || !attachmentId) return;
    setFocusedTextLayerId(activeIndex, attachmentId, null);
  }, [activeIndex, attachmentId, isTextEditing, setFocusedTextLayerId]);

  useEffect(() => {
    return () => {
      dismissEmptyTextLayers();
    };
  }, [dismissEmptyTextLayers]);

  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isAnyColorPickerMode) {
      setActiveButton('text');
      return;
    }
    if (attachmentId) {
      setFocusedTextLayerId(activeIndex, attachmentId, null);
      setActiveTextLayerId(activeIndex, attachmentId, null);
    }
    scheduleDismissEmptyTextLayers();
  };

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dismissEmptyTextLayers();
    setActiveButton('editorMainMenu');
  };

  const selectLayer = useCallback(
    (layerId: string) => {
      if (!attachmentId) return;
      setActiveTextLayerId(activeIndex, attachmentId, layerId);
      bringTextLayerToFront(activeIndex, attachmentId, layerId);
      if (!isTextEditing) {
        setActiveButton('text');
      }
    },
    [
      activeIndex,
      attachmentId,
      bringTextLayerToFront,
      isTextEditing,
      setActiveButton,
      setActiveTextLayerId,
    ],
  );

  const commitLayerTransform = useCallback(
    (layerId: string, transform: TextTransform) => {
      if (!attachmentId) return;
      updateTextLayer(activeIndex, attachmentId, layerId, {transform});
    },
    [activeIndex, attachmentId, updateTextLayer],
  );

  const beginLayerGesture = useCallback(
    (layer: TextLayer) => {
      if (!attachmentId) return;
      selectLayer(layer.id);
      setFocusedTextLayerId(activeIndex, attachmentId, null);
      pillRefs.current[layer.id]?.blurForGesture();
      bringTextLayerToFront(activeIndex, attachmentId, layer.id);
    },
    [
      activeIndex,
      attachmentId,
      bringTextLayerToFront,
      selectLayer,
      setFocusedTextLayerId,
    ],
  );

  const handleDragStart = useCallback(
    (layer: TextLayer) => {
      beginLayerGesture(layer);
      setDraggingLayerId(layer.id);
      setIsTextDragActive(true);
      setIsPointerOverTrash(false);
    },
    [beginLayerGesture],
  );

  const handleDragMove = useCallback(
    (pointer: {clientX: number; clientY: number}) => {
      setIsPointerOverTrash(
        isPointerOnTrashButton(
          pointer.clientX,
          pointer.clientY,
          textTrashButtonRef.current,
        ),
      );
    },
    [],
  );

  const endTextDrag = useCallback(() => {
    setIsTextDragActive(false);
    setDraggingLayerId(null);
    setIsPointerOverTrash(false);
  }, []);

  const handleDragEnd = useCallback(
    (layer: TextLayer, pointer: {clientX: number; clientY: number}) => {
      const shouldDelete = isPointerOnTrashButton(
        pointer.clientX,
        pointer.clientY,
        textTrashButtonRef.current,
      );

      endTextDrag();

      if (!attachmentId) return;

      if (shouldDelete) {
        delete pillRefs.current[layer.id];
        removeTextLayer(activeIndex, attachmentId, layer.id);
        return;
      }
    },
    [activeIndex, attachmentId, endTextDrag, removeTextLayer],
  );

  const handlePinchStart = useCallback(
    (layer: TextLayer) => {
      beginLayerGesture(layer);
    },
    [beginLayerGesture],
  );

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-4000 max-w-full overflow-hidden rounded-lg bg-[rgba(0,0,0,0.8)] px-0 backdrop-blur-lg"
      style={{
        paddingBottom: `calc(24% + ${safeInsets.bottom + 10}px)`,
        paddingTop: `${safeInsets.top}px`,
      }}>
      <button
        type="button"
        onClick={handleClose}
        className={`absolute ${closeTop} z-1000 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-100/20 bg-black/40 p-1 text-sm text-white hover:bg-black/80`}>
        <FontAwesomeIcon icon={faXmark} size="lg" color="white" />
      </button>

      <div className="relative h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden">
        <div className="relative w-full max-w-full min-w-0 overflow-hidden">
          <div
            className="relative w-full max-w-full min-w-0"
            onPointerDown={handlePreviewPointerDown}>
            <AdjustPreviewFrame
              post={post}
              activeIndex={activeIndex}
              transform={previewTransform}
              fromText={true}
              showTextTrashDropZone={isTextDragActive}
              isTextTrashHot={isTextDragActive && isPointerOverTrash}
              textTrashButtonRef={textTrashButtonRef}
            />
          </div>
          <div
            ref={textStageRef}
            className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            {isIndividualTextColorMode ? (
              <div className="pointer-events-none absolute inset-0 z-35 bg-black/25 backdrop-blur-[2px]" />
            ) : null}
            {layers.map(layer => {
              const isActiveLayer = layer.id === activeLayerId;
              const isColorTarget = isIndividualTextColorMode && isActiveLayer;
              const renderLayer: TextLayer = isColorTarget
                ? {
                    ...layer,
                    transform: initialTextLayerTransform(),
                    zIndex: maxLayerZIndex + 1000,
                  }
                : layer;
              const layerIsEditing = isTextEditing && isActiveLayer;

              return (
                <TextLayerGestureSurface
                  key={layer.id}
                  layer={renderLayer}
                  stageWidthPx={maxStageWidthPx}
                  stageHeightPx={maxStageHeightPx}
                  enabled={!isIndividualTextColorMode}
                  shrinkForTrashDrop={
                    isTextDragActive &&
                    draggingLayerId === layer.id &&
                    isPointerOverTrash
                  }
                  onTransform={transform =>
                    commitLayerTransform(layer.id, transform)
                  }
                  onDragStart={() => handleDragStart(layer)}
                  onDrag={handleDragMove}
                  onDragEnd={pointer => handleDragEnd(layer, pointer)}
                  onPinchStart={() => handlePinchStart(layer)}
                  onSelectLayer={() => selectLayer(layer.id)}>
                  <StoryTextPill
                    ref={el => {
                      pillRefs.current[layer.id] = el;
                    }}
                    layer={renderLayer}
                    maxStageWidthPx={maxStageWidthPx}
                    isActive={layerIsEditing}
                    onRequestFocus={() => selectLayer(layer.id)}
                    onContentChange={content => {
                      if (!attachmentId) return;
                      updateTextLayer(activeIndex, attachmentId, layer.id, {
                        content,
                      });
                    }}
                    onTextareaFocusChange={focused => {
                      if (!attachmentId) return;
                      setFocusedTextLayerId(
                        activeIndex,
                        attachmentId,
                        focused ? layer.id : null,
                      );
                    }}
                    onRemoveIfEmpty={() => {
                      if (!attachmentId) return;
                      removeTextLayer(activeIndex, attachmentId, layer.id);
                    }}
                  />
                </TextLayerGestureSurface>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
