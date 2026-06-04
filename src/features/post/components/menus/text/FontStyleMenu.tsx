import type {Insets} from '@/shared/types/webBridgeTypes';
import {
  DEFAULT_FONT_STYLE_LABEL,
  FONT_STYLES,
  type FontStyleLabel,
} from '@/assets/fonts/fontStyles';
import {appStore} from '@/store/appStore';
import React, {useCallback, useMemo} from 'react';
import {HorizontalOptionChips} from './shared/HorizontalOptionChips';
import {TextSubMenuFooter} from './shared/TextSubMenuFooter';
import {useHorizontalChipScroll} from './shared/useHorizontalChipScroll';
import {chipLabelColors} from './shared/chipOptionStyles';
import {navigateBackToTextMenu} from '@/features/post/bridge/helpers/performEditorBack';

type Props = {
  safeInsets: Insets;
};

const FONT_CHIP_OPTIONS = FONT_STYLES.map(({label, weight, style, family}) => ({
  id: label,
  label,
  weight,
  style,
  family,
}));

export const FontStyleMenu = ({safeInsets}: Props): React.JSX.Element => {
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
  const selectedLabel = activeLayer?.fontStyleLabel ?? DEFAULT_FONT_STYLE_LABEL;

  const {scrollContainerRef, registerButtonRef} = useHorizontalChipScroll({
    options: FONT_CHIP_OPTIONS,
    selectedId: selectedLabel,
  });

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setTimeout(() => navigateBackToTextMenu(), 200);
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

  return (
    <TextSubMenuFooter
      safeInsets={safeInsets}
      title="Choose Font Style"
      onBack={handleBack}>
      <HorizontalOptionChips
        options={FONT_CHIP_OPTIONS}
        selectedId={selectedLabel}
        onSelect={handleFontSelect}
        scrollContainerRef={scrollContainerRef}
        registerButtonRef={registerButtonRef}
        renderLabel={(option, isSelected) => {
          const font = FONT_STYLES.find(s => s.label === option.id);
          return (
            <p
              className="text-md text-nowrap"
              style={{
                ...chipLabelColors(isSelected),
                fontWeight: font?.weight,
                fontStyle: font?.style,
                fontFamily: font?.family,
              }}>
              {option.label}
            </p>
          );
        }}
      />
    </TextSubMenuFooter>
  );
};
