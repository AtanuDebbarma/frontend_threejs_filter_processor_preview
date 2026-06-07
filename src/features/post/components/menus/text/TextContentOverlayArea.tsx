import type {Insets} from '@/shared/types/webBridgeTypes';
import {adjustValueToPreviewTransform} from '@/features/post/helpers/adjust/adjustPreviewTransform';
import {AdjustPreviewFrame} from '@/features/post/components/menus/adjust/AdjustPreviewFrame';
import {preloadSketchColorPicker} from '@/shared/components/sketchColorPickerPreload';
import {appStore} from '@/store/appStore';
import {defaultAdjustTransform} from '@/store/adjustSlice';
import {initialTextLayerTransform} from '@/store/textSlice';
import type {TextLayer, TextTransform} from '@/store/textSlice';
import {useElementSize} from '@/features/post/hooks/canvas/useElementSize';
import {isPointerOnTrashButton} from '@/features/post/helpers/text/textTrashDropHitTest';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StoryTextPill, type StoryTextPillHandle} from './StoryTextPill';
import {TextLayerGestureSurface} from './TextLayerGestureSurface';
import type {ExportMode} from '@/features/post/types/exportTypes';
import {isPostLayoutMode} from '@/features/post/types/exportTypes';
import {navigateBackFromTextOverlay} from '@/features/post/bridge/helpers/performEditorBack';
import {
  MENU_CHROME_TEXT_OVERLAY_CLASS,
  MENU_CHROME_TEXT_OVERLAY_ENTER_CLASS,
} from '@/features/post/helpers/menuChrome/menuChromeClasses';
import {scheduleMenuChromeBack} from '@/features/post/helpers/menuChrome/menuChromeNavigation';

type Props = {
  exportMode: ExportMode;
  safeInsets: Insets;
};

export const TextContentOverlayArea = ({
  exportMode,
  safeInsets,
}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const activeButton = appStore(state => state.activeButton);
  const isMenuChromeTransitioning = appStore(
    state => state.isMenuChromeTransitioning,
  );
  const menuChromeTransitionKind = appStore(
    state => state.menuChromeTransitionKind,
  );
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
    preloadSketchColorPicker();
  }, []);

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

  /** AdjustMenu-style: blur keyboard when transform gesture starts (not on pointer down). */
  const beginLayerGesture = useCallback(
    (layer: TextLayer) => {
      if (!attachmentId) return;
      setActiveTextLayerId(activeIndex, attachmentId, layer.id);
      bringTextLayerToFront(activeIndex, attachmentId, layer.id);
      setFocusedTextLayerId(activeIndex, attachmentId, null);
      pillRefs.current[layer.id]?.blurForGesture();
    },
    [
      activeIndex,
      attachmentId,
      bringTextLayerToFront,
      setActiveTextLayerId,
      setFocusedTextLayerId,
    ],
  );

  const handleGestureStart = useCallback(
    (layer: TextLayer, kind: 'drag' | 'pinch') => {
      beginLayerGesture(layer);
      if (kind === 'drag') {
        setDraggingLayerId(layer.id);
        setIsTextDragActive(true);
        setIsPointerOverTrash(false);
      }
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

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    scheduleMenuChromeBack(navigateBackFromTextOverlay);
  };

  const overlayEnterClass =
    menuChromeTransitionKind === 'overlay-enter'
      ? MENU_CHROME_TEXT_OVERLAY_ENTER_CLASS
      : '';
  const gesturesEnabled =
    !isMenuChromeTransitioning && !isIndividualTextColorMode;

  const closeTop = isPostLayoutMode(exportMode)
    ? 'top-5 left-6 '
    : 'left-7 top-8';

  return (
    <div
      className={`${MENU_CHROME_TEXT_OVERLAY_CLASS} ${overlayEnterClass} absolute inset-0 z-4000 h-full max-w-full overflow-hidden rounded-lg bg-[rgba(0,0,0,0.8)] px-0 backdrop-blur-lg ${
        isMenuChromeTransitioning
          ? 'pointer-events-none'
          : 'pointer-events-auto'
      }`}
      style={{paddingBottom: `${safeInsets.bottom + 10}px`}}>
      <button
        type="button"
        onClick={handleBack}
        className={`pointer-events-auto absolute ${closeTop} z-1000 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-100/20 bg-black/40 p-1 text-sm text-white hover:bg-black/80`}>
        <FontAwesomeIcon icon={faXmark} size="lg" color="white" />
      </button>
      <div className="relative h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden">
        <div
          className="relative w-full max-w-full min-w-0"
          onPointerDown={handlePreviewPointerDown}>
          <AdjustPreviewFrame
            exportMode={exportMode}
            activeIndex={activeIndex}
            transform={previewTransform}
            showTextTrashDropZone={isTextDragActive}
            isTextTrashHot={isTextDragActive && isPointerOverTrash}
            textTrashButtonRef={textTrashButtonRef}
          />
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
                  enabled={gesturesEnabled}
                  shrinkForTrashDrop={
                    isTextDragActive &&
                    draggingLayerId === layer.id &&
                    isPointerOverTrash
                  }
                  onCommitTransform={transform =>
                    commitLayerTransform(layer.id, transform)
                  }
                  onGestureStart={kind => handleGestureStart(layer, kind)}
                  onDrag={handleDragMove}
                  onDragEnd={pointer => handleDragEnd(layer, pointer)}
                  onTapSelect={() => selectLayer(layer.id)}>
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
