import type {AppColors, Insets} from '@/App';
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
  appColors: AppColors;
  safeInsets: Insets;
};

export const FontStyleMenu = ({
  appColors,
  safeInsets,
}: Props): React.JSX.Element => {
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
      className="z-5000 flex h-[24%] flex-col rounded-t-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
      style={{
        backgroundColor: appColors.bottomMenuBackground,
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      {/* Back button header */}
      <div className="flex items-center px-4 py-2">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-orange-600 transition-opacity duration-180 active:opacity-50">
          <FontAwesomeIcon icon={faArrowLeft} size="sm" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>
      <div className="pb-5 text-center">
        <h3
          className="text-md font-medium"
          style={{
            color: appColors.textColor,
          }}>
          Choose Font Style
        </h3>
      </div>
      <div
        ref={scrollContainerRef}
        className="scrollbar-hide mx-2 flex overflow-x-auto"
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
              className="mx-1.5 shrink-0 rounded-lg border px-4 py-2 shadow-sm transition-opacity duration-180 active:opacity-50"
              style={{
                backgroundColor: isSelected ? '#ff4800' : appColors.buttonColor,
                borderColor: isSelected ? '#ff4800' : 'rgb(209 213 219)',
              }}>
              <p
                className="text-lg text-nowrap"
                style={{
                  color: isSelected ? '#ffffff' : appColors.textColor,
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
