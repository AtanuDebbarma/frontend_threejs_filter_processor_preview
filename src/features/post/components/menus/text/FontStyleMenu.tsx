import type {Insets} from '@/shared/types/webBridgeTypes';
import {
  DEFAULT_FONT_STYLE_LABEL,
  FONT_STYLES,
  type FontStyleLabel,
} from '@/assets/fonts/fontStyles';
import {appStore} from '@/store/appStore';
import {faArrowLeft} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useCallback, useEffect, useMemo, useRef} from 'react';

type Props = {
  safeInsets: Insets;
};

export const FontStyleMenu = ({safeInsets}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const activeIndex = appStore(state => state.activeIndex);
  const mediaFiles = appStore(state => state.mediaFiles);
  const textSlide = appStore(state => state.textEditorByIndex[activeIndex]);
  const setTextLayerFontStyle = appStore(state => state.setTextLayerFontStyle);
  const setAllTextLayersFontStyle = appStore(
    state => state.setAllTextLayersFontStyle,
  );

  const attachmentId = mediaFiles[activeIndex]?.id ?? '';
  const activeLayer = useMemo(() => {
    if (!textSlide || textSlide.id !== attachmentId) return null;
    const activeLayerId = textSlide.activeLayerId;
    if (!activeLayerId) return null;
    return textSlide.layers.find(l => l.id === activeLayerId) ?? null;
  }, [attachmentId, textSlide]);

  const selectedLayerId = activeLayer?.id ?? null;
  const referenceLayer = activeLayer;
  const selectedLabel =
    referenceLayer?.fontStyleLabel ?? DEFAULT_FONT_STYLE_LABEL;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setTimeout(() => {
      setActiveButton('text');
    }, 200);
  };

  const handleFontSelect = useCallback(
    (label: FontStyleLabel) => {
      if (!attachmentId) return;
      if (selectedLayerId) {
        setTextLayerFontStyle(
          activeIndex,
          attachmentId,
          selectedLayerId,
          label,
        );
      } else {
        setAllTextLayersFontStyle(activeIndex, attachmentId, label);
      }
    },
    [
      activeIndex,
      attachmentId,
      selectedLayerId,
      setAllTextLayersFontStyle,
      setTextLayerFontStyle,
    ],
  );

  useEffect(() => {
    const selectedIndex = FONT_STYLES.findIndex(
      style => style.label === selectedLabel,
    );
    if (selectedIndex < 0) return;

    const selectedButton = buttonRefs.current[selectedLabel];
    if (!selectedButton) return;

    // Edge items: only ensure visible; middle items: center in viewport.
    if (selectedIndex === 0 || selectedIndex === FONT_STYLES.length - 1) {
      selectedButton.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'auto',
      });
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const targetLeft =
      selectedButton.offsetLeft -
      (container.clientWidth - selectedButton.offsetWidth) / 2;
    const maxScrollLeft = Math.max(
      0,
      container.scrollWidth - container.clientWidth,
    );
    container.scrollTo({
      left: Math.min(Math.max(0, targetLeft), maxScrollLeft),
      behavior: 'auto',
    });
  }, [selectedLabel]);

  return (
    <footer
      className="pointer-events-none fixed right-0 bottom-0 left-0 z-5000 flex flex-col bg-transparent"
      style={{
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      {/* Back button header */}
      <div className="pointer-events-none flex items-center px-4 py-0">
        <button
          type="button"
          onClick={handleBack}
          className="pointer-events-auto flex items-center gap-1 text-orange-600 transition-opacity duration-180 active:opacity-50">
          <FontAwesomeIcon icon={faArrowLeft} size="sm" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>
      <div className="pb-4 text-center text-white/65">
        <h3 className="text-sm font-medium">Choose Font Style</h3>
      </div>

      <div
        ref={scrollContainerRef}
        className="scrollbar-hide pointer-events-none mx-2 flex overflow-x-auto"
        style={{WebkitOverflowScrolling: 'touch'}}>
        {FONT_STYLES.map(({label, weight, style, family}) => {
          const isSelected = selectedLabel === label;
          return (
            <button
              key={label}
              ref={el => {
                buttonRefs.current[label] = el;
              }}
              type="button"
              onClick={() => handleFontSelect(label)}
              className="pointer-events-auto mx-1.5 shrink-0 rounded-lg border px-4 py-2 shadow-sm transition-opacity duration-180 active:opacity-50"
              style={{
                backgroundColor: isSelected
                  ? '#ff4800'
                  : 'rgba(217, 217, 217, 1)',
                borderColor: isSelected ? '#ff4800' : 'rgba(209 213 219,1)',
              }}>
              <p
                className="text-lg text-nowrap"
                style={{
                  color: isSelected ? '#ffffff' : 'rgba(0, 0, 0, 1)',
                  fontWeight: weight,
                  fontStyle: style,
                  fontFamily: family,
                }}>
                {label}
              </p>
            </button>
          );
        })}
      </div>
    </footer>
  );
};
