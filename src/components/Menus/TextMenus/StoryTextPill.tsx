import {
  inactiveIgPillStyle,
  resolveTextPillLineBackground,
  storyTextPillOverlayInputStyle,
} from '@/helpers/textPillStyle';
import {
  createCanvasTextMeasurer,
  mapCaretAfterStoryTextWrap,
  wrapStoryTextContentToStage,
} from '@/helpers/textLineWrap';
import {getFontStylePreset} from '@/assets/fonts/fontStyles';
import type {TextLayer} from '@/store/textSlice';
import {
  DEFAULT_TEXT_FONT_SIZE_PX,
  isTextLayerContentEmpty,
  resolveTextAlign,
} from '@/store/textSlice';
import {normalizeContentForInactive} from '@/components/Menus/TextMenus/storyTextPillLines';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type StoryTextPillHandle = {
  /** Blur textarea when a drag/pinch gesture starts (skips empty removal). */
  blurForGesture: () => void;
};

type Props = {
  layer: TextLayer;
  /** Width of the text stage (preview overlay box). */
  maxStageWidthPx: number;
  isActive?: boolean;
  onContentChange?: (content: string) => void;
  onRequestFocus?: () => void;
  /** Called when this layer's textarea gains or loses browser focus. */
  onTextareaFocusChange?: (focused: boolean) => void;
  /** Called after blur when trimmed content is empty — remove this layer. */
  onRemoveIfEmpty?: () => void;
};

const ltrTextStyle: React.CSSProperties = {
  direction: 'ltr',
  unicodeBidi: 'plaintext',
};

const pillTypographyStyle = (
  layer: TextLayer,
  fontPreset: ReturnType<typeof getFontStylePreset>,
): React.CSSProperties => ({
  ...ltrTextStyle,
  fontFamily: fontPreset?.family
    ? `"${fontPreset.family}", var(--font-sans, Poppins, system-ui, sans-serif)`
    : 'var(--font-sans, Poppins, system-ui, sans-serif)',
  fontSize: DEFAULT_TEXT_FONT_SIZE_PX,
  fontWeight: fontPreset?.weight ?? '400',
  fontStyle: fontPreset?.style ?? 'normal',
  textDecorationLine: layer.underline ? 'underline' : 'none',
  WebkitTextStroke:
    layer.backgroundStyle === 'outlined'
      ? `1.2px ${layer.backgroundColor}`
      : undefined,
  WebkitTextFillColor:
    layer.backgroundStyle === 'outlined' ? 'transparent' : undefined,
  color: layer.backgroundStyle === 'outlined' ? 'transparent' : layer.color,
});

const displayTextFromContent = (
  content: string,
  forEditing: boolean,
): string => {
  const normalized = forEditing
    ? content
    : normalizeContentForInactive(content);
  return normalized.length > 0 ? normalized : '\u00A0';
};

export const StoryTextPill = forwardRef<StoryTextPillHandle, Props>(
  function StoryTextPill(
    {
      layer,
      maxStageWidthPx,
      isActive = false,
      onContentChange,
      onRequestFocus,
      onTextareaFocusChange,
      onRemoveIfEmpty,
    },
    ref,
  ): React.JSX.Element {
    const fontPreset = getFontStylePreset(layer.fontStyleLabel);
    const displayRef = useRef<HTMLSpanElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [isTextFocused, setIsTextFocused] = useState(isActive);
    const showEditMode = isActive && isTextFocused;
    const lineBackground = resolveTextPillLineBackground(layer);
    const typography = pillTypographyStyle(layer, fontPreset);
    const textAlign = resolveTextAlign(layer);

    const measureText = useMemo(
      () =>
        createCanvasTextMeasurer({
          fontFamily: fontPreset?.family ?? 'Poppins',
          fontSize: DEFAULT_TEXT_FONT_SIZE_PX,
          fontWeight: String(fontPreset?.weight ?? '400'),
          fontStyle: fontPreset?.style ?? 'normal',
        }),
      [fontPreset?.family, fontPreset?.style, fontPreset?.weight],
    );

    const wasEditingRef = useRef(showEditMode);
    const skipEmptyRemoveOnBlurRef = useRef(false);

    useImperativeHandle(ref, () => ({
      blurForGesture: () => {
        skipEmptyRemoveOnBlurRef.current = true;
        const ta = textareaRef.current;
        if (ta && document.activeElement === ta) {
          ta.blur();
        } else {
          setIsTextFocused(false);
          onTextareaFocusChange?.(false);
          skipEmptyRemoveOnBlurRef.current = false;
        }
      },
    }));

    const wrapForStage = useCallback(
      (raw: string) =>
        wrapStoryTextContentToStage(raw, maxStageWidthPx, measureText),
      [maxStageWidthPx, measureText],
    );

    const commitInactiveLineCleanup = useCallback(() => {
      if (!onContentChange) return;
      const source = textareaRef.current?.value ?? layer.content;
      const next = normalizeContentForInactive(wrapForStage(source));
      if (next !== layer.content) {
        onContentChange(next);
      }
    }, [layer.content, onContentChange, wrapForStage]);

    useEffect(() => {
      if (wasEditingRef.current && !showEditMode) {
        commitInactiveLineCleanup();
      }
      wasEditingRef.current = showEditMode;
    }, [showEditMode, commitInactiveLineCleanup]);

    useEffect(() => {
      return () => {
        if (wasEditingRef.current) {
          commitInactiveLineCleanup();
        }
      };
    }, [commitInactiveLineCleanup]);

    useEffect(() => {
      if (isActive) {
        setIsTextFocused(true);
      } else {
        setIsTextFocused(false);
      }
    }, [isActive, layer.id]);

    useLayoutEffect(() => {
      if (!showEditMode) return;
      const ta = textareaRef.current;
      if (!ta) return;
      if (document.activeElement === ta) return;
      const wrapped = wrapForStage(layer.content);
      if (ta.value !== wrapped) {
        ta.value = wrapped;
      }
    }, [layer.content, showEditMode, layer.id, wrapForStage]);

    const syncTextareaToDisplay = useCallback(() => {
      const span = displayRef.current;
      const ta = textareaRef.current;
      if (!span || !ta) return;
      ta.style.width = `${span.offsetWidth}px`;
      ta.style.height = `${span.offsetHeight}px`;
    }, []);

    useLayoutEffect(() => {
      if (!showEditMode) return;
      syncTextareaToDisplay();
    }, [layer.content, showEditMode, layer.id, syncTextareaToDisplay]);

    useEffect(() => {
      if (!showEditMode) return;
      const id = requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        const end = ta.value.length;
        ta.setSelectionRange(end, end);
      });
      return () => cancelAnimationFrame(id);
    }, [showEditMode, layer.id]);

    const handleTextareaChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      const ta = e.target;
      const raw = ta.value;
      const selStart = ta.selectionStart ?? raw.length;
      const selEnd = ta.selectionEnd ?? selStart;
      const wrapped = wrapForStage(raw);

      if (wrapped !== raw) {
        ta.value = wrapped;
        const newStart = mapCaretAfterStoryTextWrap(raw, wrapped, selStart);
        const newEnd = mapCaretAfterStoryTextWrap(raw, wrapped, selEnd);
        requestAnimationFrame(() => {
          ta.setSelectionRange(newStart, newEnd);
        });
      }

      onContentChange?.(wrapped);
      requestAnimationFrame(syncTextareaToDisplay);
    };

    const handleTextareaFocus = () => {
      setIsTextFocused(true);
      onRequestFocus?.();
      onTextareaFocusChange?.(true);
    };

    const handleTextareaBlur = () => {
      requestAnimationFrame(() => {
        if (document.activeElement === textareaRef.current) return;

        if (skipEmptyRemoveOnBlurRef.current) {
          skipEmptyRemoveOnBlurRef.current = false;
          const source = textareaRef.current?.value ?? layer.content;
          const normalized = normalizeContentForInactive(wrapForStage(source));
          if (
            !isTextLayerContentEmpty(normalized) &&
            normalized !== layer.content
          ) {
            onContentChange?.(normalized);
          }
          setIsTextFocused(false);
          onTextareaFocusChange?.(false);
          return;
        }

        const source = textareaRef.current?.value ?? layer.content;
        const normalized = normalizeContentForInactive(wrapForStage(source));

        if (isTextLayerContentEmpty(normalized)) {
          onRemoveIfEmpty?.();
          return;
        }

        if (normalized !== layer.content) {
          onContentChange?.(normalized);
        }
        setIsTextFocused(false);
        onTextareaFocusChange?.(false);
      });
    };

    const requestEditFocus = () => {
      onRequestFocus?.();
      if (!isActive) return;
      setIsTextFocused(true);
    };

    const stageMaxWidth =
      maxStageWidthPx > 0 ? `${maxStageWidthPx}px` : undefined;

    const displayText = useMemo(
      () => displayTextFromContent(layer.content, showEditMode),
      [layer.content, showEditMode],
    );

    const wrapperStyle: React.CSSProperties = {
      ...ltrTextStyle,
      display: 'inline-block',
      position: 'relative',
      maxWidth: stageMaxWidth,
      minWidth: 0,
      textAlign,
    };

    const displaySpan = (
      <span
        ref={displayRef}
        dir="ltr"
        lang="en"
        aria-hidden={showEditMode}
        className="story-text-pill-display pointer-events-none select-none"
        style={{
          ...inactiveIgPillStyle(layer, lineBackground, typography),
          ...(showEditMode &&
          !layer.backgroundEnabled &&
          layer.backgroundStyle !== 'outlined'
            ? {backgroundColor: 'rgba(255, 255, 255, 0.12)'}
            : null),
        }}>
        {displayText}
      </span>
    );

    if (!showEditMode) {
      return (
        <div
          dir="ltr"
          lang="en"
          className={isActive ? 'pointer-events-auto' : 'pointer-events-none'}
          style={wrapperStyle}
          onMouseDown={e => {
            e.stopPropagation();
            requestEditFocus();
          }}>
          {displaySpan}
        </div>
      );
    }

    return (
      <div
        dir="ltr"
        lang="en"
        className="pointer-events-auto relative"
        style={wrapperStyle}
        onMouseDown={e => {
          e.stopPropagation();
          requestEditFocus();
        }}>
        {displaySpan}
        <textarea
          ref={textareaRef}
          dir="ltr"
          lang="en"
          rows={1}
          aria-label="Story text"
          className="story-text-pill-overlay-input"
          defaultValue={wrapForStage(layer.content)}
          spellCheck={false}
          autoCapitalize="sentences"
          autoCorrect="off"
          style={{
            ...storyTextPillOverlayInputStyle(layer, typography),
            textAlign,
          }}
          onChange={handleTextareaChange}
          onFocus={handleTextareaFocus}
          onBlur={handleTextareaBlur}
        />
      </div>
    );
  },
);
