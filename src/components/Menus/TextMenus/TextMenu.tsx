import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {LazySketchColorPicker} from '@/components/shared/LazySketchColorPicker';
import {useThrottledHexCommit} from '@/hooks/useThrottledHexCommit';
import {appStore} from '../../../store/appStore';
import {
  canAddTextLayer,
  DEFAULT_TEXT_ALIGN,
  DEFAULT_TEXT_BACKGROUND_COLOR,
  MAX_TEXT_LAYERS_PER_SLIDE,
  resolveTextAlign,
} from '../../../store/textSlice';
import {
  defaultNewTextLayerFontStyle,
  defaultNewTextLayerPatch,
} from './textLayerDefaults';
import {
  faAlignCenter,
  faAlignLeft,
  faAlignRight,
  faArrowLeft,
  faComment,
  faFill,
  faFlorinSign,
  faFont,
  faHighlighter,
  faUnderline,
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type {AppColors, Insets} from '../../../App';
import type {IconDefinition} from '@fortawesome/fontawesome-svg-core';

type Props = {
  appColors: AppColors;
  safeInsets: Insets;
};

export const TextMenu = ({appColors, safeInsets}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const activeButton = appStore(state => state.activeButton);
  const activeIndex = appStore(state => state.activeIndex);
  const attachmentId = appStore(
    state => state.mediaFiles[state.activeIndex]?.id ?? '',
  );
  const textSlide = appStore(state => state.textEditorByIndex[activeIndex]);
  const ensureTextSlide = appStore(state => state.ensureTextSlide);
  const addTextLayer = appStore(state => state.addTextLayer);
  const updateTextLayer = appStore(state => state.updateTextLayer);
  const setTextLayerFontStyle = appStore(state => state.setTextLayerFontStyle);
  const setActiveTextLayerId = appStore(state => state.setActiveTextLayerId);
  const setAllTextLayersAlign = appStore(state => state.setAllTextLayersAlign);
  const setAllTextLayersUnderline = appStore(
    state => state.setAllTextLayersUnderline,
  );
  const setAllTextLayersColor = appStore(state => state.setAllTextLayersColor);
  const setAllTextLayersBackgroundColor = appStore(
    state => state.setAllTextLayersBackgroundColor,
  );
  const pruneEmptyTextLayers = appStore(state => state.pruneEmptyTextLayers);

  const layerCount =
    textSlide?.id === attachmentId ? (textSlide.layers?.length ?? 0) : 0;
  const hasTextLayers = layerCount > 0;
  const canAddMore = canAddTextLayer(textSlide, attachmentId);

  const activeLayer = useMemo(() => {
    if (!textSlide || textSlide.id !== attachmentId) return null;
    const activeId = textSlide.activeLayerId;
    if (!activeId) return null;
    return textSlide.layers.find(l => l.id === activeId) ?? null;
  }, [attachmentId, textSlide]);

  /** The layer whose textarea currently has browser focus (null = none). */
  const focusedLayerId = useMemo(
    () =>
      textSlide?.id === attachmentId
        ? (textSlide.focusedTextLayerId ?? null)
        : null,
    [attachmentId, textSlide],
  );

  const focusedLayer = useMemo(() => {
    if (!focusedLayerId || !textSlide || textSlide.id !== attachmentId)
      return null;
    return textSlide.layers.find(l => l.id === focusedLayerId) ?? null;
  }, [attachmentId, focusedLayerId, textSlide]);

  /** Reference layer for reading current alignment: focused > active > default. */
  const referenceLayer = focusedLayer ?? activeLayer;
  const isTextColorMode = activeButton === 'textColor';
  const isTextBackgroundColorMode = activeButton === 'textBackgroundColor';
  const isAnyColorPickerMode = isTextColorMode || isTextBackgroundColorMode;
  const textColorPickerRef = useRef<HTMLDivElement | null>(null);

  const textAlignIcon: IconDefinition = useMemo(() => {
    const align = referenceLayer
      ? resolveTextAlign(referenceLayer)
      : DEFAULT_TEXT_ALIGN;
    return align === 'center'
      ? faAlignCenter
      : align === 'left'
        ? faAlignLeft
        : faAlignRight;
  }, [referenceLayer]);

  /** Ensure slide exists; restore active layer selection only — no auto-create. */
  useEffect(() => {
    if (!attachmentId) return;

    ensureTextSlide(activeIndex, attachmentId);

    const slide = appStore.getState().textEditorByIndex[activeIndex];
    if (!slide || slide.id !== attachmentId || slide.layers.length === 0) {
      return;
    }

    const layerId =
      slide.activeLayerId ?? slide.layers[slide.layers.length - 1]?.id ?? null;
    if (layerId) {
      setActiveTextLayerId(activeIndex, attachmentId, layerId);
    }
  }, [activeIndex, attachmentId, ensureTextSlide, setActiveTextLayerId]);

  useEffect(() => {
    if (!isAnyColorPickerMode) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const pickerEl = textColorPickerRef.current;
      const targetNode = event.target as Node | null;
      if (pickerEl && targetNode && pickerEl.contains(targetNode)) {
        return;
      }
      setActiveButton('text');
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
    };
  }, [isAnyColorPickerMode, setActiveButton]);

  const createNextTextLayer = useCallback((): boolean => {
    if (!attachmentId) return false;

    ensureTextSlide(activeIndex, attachmentId);

    const slide = appStore.getState().textEditorByIndex[activeIndex];
    if (!canAddTextLayer(slide, attachmentId)) {
      return false;
    }

    const newLayerId = addTextLayer(activeIndex, attachmentId);
    if (!newLayerId) return false;

    updateTextLayer(activeIndex, attachmentId, newLayerId, {
      ...defaultNewTextLayerPatch,
    });
    setTextLayerFontStyle(
      activeIndex,
      attachmentId,
      newLayerId,
      defaultNewTextLayerFontStyle,
    );
    setActiveTextLayerId(activeIndex, attachmentId, newLayerId);
    setActiveButton('text');
    return true;
  }, [
    activeIndex,
    addTextLayer,
    attachmentId,
    ensureTextSlide,
    setActiveButton,
    setActiveTextLayerId,
    setTextLayerFontStyle,
    updateTextLayer,
  ]);

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setTimeout(() => {
      if (isAnyColorPickerMode) {
        setActiveButton('text');
        return;
      }
      if (attachmentId) {
        pruneEmptyTextLayers(activeIndex, attachmentId);
      }
      setActiveButton('editorMainMenu');
    }, 200);
  };

  const handleTextAlignToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!attachmentId) return;

    const current = referenceLayer
      ? resolveTextAlign(referenceLayer)
      : DEFAULT_TEXT_ALIGN;
    const nextAlign =
      current === 'center' ? 'left' : current === 'left' ? 'right' : 'center';

    if (focusedLayerId) {
      updateTextLayer(activeIndex, attachmentId, focusedLayerId, {
        textAlign: nextAlign,
      });
    } else {
      setAllTextLayersAlign(activeIndex, attachmentId, nextAlign);
    }
  };

  const handleUnderlineToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!attachmentId) return;

    const slide = appStore.getState().textEditorByIndex[activeIndex];
    if (!slide || slide.id !== attachmentId || slide.layers.length === 0) {
      return;
    }

    if (focusedLayerId) {
      const layer = slide.layers.find(l => l.id === focusedLayerId);
      updateTextLayer(activeIndex, attachmentId, focusedLayerId, {
        underline: !layer?.underline,
      });
      return;
    }

    // Global: derive from all layers (not referenceLayer — it is null when nothing is focused/active).
    const allUnderlined = slide.layers.every(layer => layer.underline);
    setAllTextLayersUnderline(activeIndex, attachmentId, !allUnderlined);
  };

  const handleTextColorChange = useCallback(
    (hexColor: string) => {
      if (!attachmentId) return;
      const selectedLayerId = activeLayer?.id ?? null;
      if (selectedLayerId) {
        updateTextLayer(activeIndex, attachmentId, selectedLayerId, {
          color: hexColor,
        });
      } else {
        setAllTextLayersColor(activeIndex, attachmentId, hexColor);
      }
    },
    [
      activeIndex,
      activeLayer?.id,
      attachmentId,
      setAllTextLayersColor,
      updateTextLayer,
    ],
  );

  const handleTextBackgroundColorChange = useCallback(
    (hexColor: string) => {
      if (!attachmentId) return;
      const selectedLayerId = activeLayer?.id ?? null;
      if (selectedLayerId) {
        updateTextLayer(activeIndex, attachmentId, selectedLayerId, {
          backgroundColor: hexColor,
        });
      } else {
        setAllTextLayersBackgroundColor(activeIndex, attachmentId, hexColor);
      }
    },
    [
      activeIndex,
      activeLayer?.id,
      attachmentId,
      setAllTextLayersBackgroundColor,
      updateTextLayer,
    ],
  );
  const {onChange: handleTextColorPickerChange, flushPending: flushTextColor} =
    useThrottledHexCommit(handleTextColorChange);
  const {
    onChange: handleTextBackgroundColorPickerChange,
    flushPending: flushTextBackgroundColor,
  } = useThrottledHexCommit(handleTextBackgroundColorChange);

  const handleButtonToggle = (
    button:
      | 'fontStyle'
      | 'textBackground'
      | 'textColor'
      | 'textBackgroundColor'
      | null,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    setTimeout(() => {
      if (button === null) {
        createNextTextLayer();
        return;
      }
      setActiveButton(button);
    }, 200);
  };

  const menuButtons = useMemo(
    () =>
      hasTextLayers
        ? [
            {icon: faFont, label: 'Add Text', button: null},
            {
              icon: faFlorinSign,
              label: 'Font Style',
              button: 'fontStyle' as const,
            },
            {
              icon: faUnderline,
              label: 'Underline',
              button: 'underline' as const,
            },
            {
              icon: textAlignIcon,
              label: 'Text Align',
              button: 'textAlign' as const,
            },
            {
              icon: faHighlighter,
              label: 'Text Color',
              button: 'textColor' as const,
            },
            {
              icon: faComment,
              label: 'Background',
              button: 'textBackground' as const,
            },
            {
              icon: faFill,
              label: 'Background Color',
              button: 'textBackgroundColor' as const,
            },
          ]
        : [{icon: faFont, label: 'Add Text', button: null}],
    [hasTextLayers, textAlignIcon],
  );

  return (
    <footer
      className={`fixed right-0 bottom-0 left-0 z-5000 flex flex-col rounded-t-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]`}
      style={{
        backgroundColor: appColors.bottomMenuBackground,
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      {/* Back button header */}
      <div className="flex items-center px-4 py-1">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-orange-600 transition-opacity duration-180 active:opacity-50">
          <FontAwesomeIcon icon={faArrowLeft} size="sm" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>
      <div className="pt-[-1.8rem] pb-2 text-center">
        <h3
          className="text-md font-medium"
          style={{
            color: appColors.textColor,
          }}>
          Text Options
        </h3>
      </div>

      <div
        className={`flex flex-row items-center overflow-x-auto px-2 pt-2 pb-5 text-sm font-medium ${
          hasTextLayers ? '' : 'justify-center'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
        {menuButtons.map(({icon, label, button}) => {
          const isAddText = button === null;
          const disabled = isAddText && !canAddMore;

          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onPointerDown={e => {
                if (button === 'textAlign') {
                  e.preventDefault();
                }
              }}
              onClick={e => {
                if (button === 'textAlign') {
                  handleTextAlignToggle(e);
                  return;
                }
                if (button === 'underline') {
                  handleUnderlineToggle(e);
                  return;
                }
                handleButtonToggle(button, e);
              }}
              className="mx-1.5 flex w-32 shrink-0 flex-col items-center gap-1.5 rounded-lg border border-gray-300 px-2 py-3 shadow-sm transition-opacity duration-180 active:opacity-50 disabled:opacity-40"
              style={{
                color: appColors.textColor,
                backgroundColor: appColors.buttonColor,
              }}>
              <FontAwesomeIcon icon={icon} size="lg" />
              <span className="text-xs text-nowrap">
                {label}
                {isAddText && layerCount > 0
                  ? ` (${layerCount}/${MAX_TEXT_LAYERS_PER_SLIDE})`
                  : ''}
              </span>
            </button>
          );
        })}
      </div>
      {isAnyColorPickerMode ? (
        <div className="pointer-events-auto absolute bottom-[calc(100%+8px)] left-1/2 z-6000 -translate-x-1/2 px-3">
          <div
            ref={textColorPickerRef}
            className="rounded-lg bg-white p-2 shadow-lg"
            onPointerUpCapture={() => {
              if (isTextColorMode) {
                flushTextColor();
              } else {
                flushTextBackgroundColor();
              }
            }}
            onPointerCancel={() => {
              if (isTextColorMode) {
                flushTextColor();
              } else {
                flushTextBackgroundColor();
              }
            }}
            onClick={e => e.stopPropagation()}>
            <LazySketchColorPicker
              color={
                isTextColorMode
                  ? (activeLayer?.color ?? '#ffffff')
                  : (activeLayer?.backgroundColor ??
                    DEFAULT_TEXT_BACKGROUND_COLOR)
              }
              width={300}
              onChange={(color: {hex: string}) =>
                isTextColorMode
                  ? handleTextColorPickerChange(color)
                  : handleTextBackgroundColorPickerChange(color)
              }
            />
          </div>
        </div>
      ) : null}
    </footer>
  );
};
