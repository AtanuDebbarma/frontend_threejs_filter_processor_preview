import type {AppColors, Insets} from '@/App';
import {appStore} from '@/store/appStore';
import {DEFAULT_TEXT_COLOR} from '@/store/textSlice';
import {DEFAULT_TEXT_BACKGROUND_COLOR} from '@/store/textSlice';
import type {TextLayer} from '@/store/textSlice';
import {faArrowLeft} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useCallback, useMemo, useRef} from 'react';

type Props = {
  appColors: AppColors;
  safeInsets: Insets;
};

type BackgroundMode =
  | 'defaultPill'
  | 'none'
  | 'square'
  | 'rounded'
  | 'outlined';

const resolveModeFromLayer = (layer: TextLayer | null): BackgroundMode => {
  if (!layer) return 'defaultPill';
  if (layer.backgroundStyle === 'outlined') return 'outlined';
  if (!layer.backgroundEnabled) return 'none';
  if (layer.backgroundStyle === 'square' || layer.backgroundStyle === 'box') {
    return 'square';
  }
  if (layer.backgroundStyle === 'rounded') return 'rounded';
  return 'defaultPill';
};

const modePatch = (
  mode: BackgroundMode,
): Pick<TextLayer, 'backgroundEnabled' | 'backgroundStyle'> => {
  switch (mode) {
    case 'none':
      return {backgroundEnabled: false, backgroundStyle: 'pill'};
    case 'square':
      return {backgroundEnabled: true, backgroundStyle: 'square'};
    case 'rounded':
      return {backgroundEnabled: true, backgroundStyle: 'rounded'};
    case 'outlined':
      return {backgroundEnabled: false, backgroundStyle: 'outlined'};
    case 'defaultPill':
    default:
      return {backgroundEnabled: true, backgroundStyle: 'pill'};
  }
};

export const TextBackgroundMenu = ({
  appColors,
  safeInsets,
}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const activeIndex = appStore(state => state.activeIndex);
  const mediaFiles = appStore(state => state.mediaFiles);
  const textSlide = appStore(state => state.textEditorByIndex[activeIndex]);
  const updateTextLayer = appStore(state => state.updateTextLayer);
  const setAllTextLayersBackgroundMode = appStore(
    state => state.setAllTextLayersBackgroundMode,
  );
  const setAllTextLayersBackgroundColor = appStore(
    state => state.setAllTextLayersBackgroundColor,
  );

  const attachmentId = mediaFiles[activeIndex]?.id ?? '';
  const previousNonOutlinedColorByLayerRef = useRef<Record<string, string>>({});
  const previousGlobalNonOutlinedColorsRef = useRef<Record<
    string,
    string
  > | null>(null);
  const activeLayer = useMemo(() => {
    if (!textSlide || textSlide.id !== attachmentId) return null;
    const activeLayerId = textSlide.activeLayerId;
    if (!activeLayerId) return null;
    return textSlide.layers.find(l => l.id === activeLayerId) ?? null;
  }, [attachmentId, textSlide]);

  const selectedLayerId = activeLayer?.id ?? null;
  const selectedMode = resolveModeFromLayer(activeLayer);
  const isGlobalOutlined = useMemo(() => {
    if (
      !textSlide ||
      textSlide.id !== attachmentId ||
      textSlide.layers.length === 0
    ) {
      return false;
    }
    return textSlide.layers.every(
      layer => layer.backgroundStyle === 'outlined',
    );
  }, [attachmentId, textSlide]);

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setTimeout(() => {
      setActiveButton('text');
    }, 200);
  };

  const handleModeSelect = useCallback(
    (mode: BackgroundMode) => {
      if (!attachmentId) return;
      const patch = modePatch(mode);
      if (selectedLayerId) {
        const selectedLayer = textSlide?.layers.find(
          l => l.id === selectedLayerId,
        );
        if (!selectedLayer) return;

        const isCurrentlyOutlined =
          selectedLayer.backgroundStyle === 'outlined';
        if (mode === 'outlined' && !isCurrentlyOutlined) {
          previousNonOutlinedColorByLayerRef.current[selectedLayerId] =
            selectedLayer.backgroundColor || DEFAULT_TEXT_BACKGROUND_COLOR;
        }

        updateTextLayer(activeIndex, attachmentId, selectedLayerId, patch);
        if (mode === 'outlined') {
          updateTextLayer(activeIndex, attachmentId, selectedLayerId, {
            backgroundColor: DEFAULT_TEXT_COLOR,
          });
        } else if (isCurrentlyOutlined) {
          updateTextLayer(activeIndex, attachmentId, selectedLayerId, {
            backgroundColor:
              previousNonOutlinedColorByLayerRef.current[selectedLayerId] ??
              DEFAULT_TEXT_BACKGROUND_COLOR,
          });
        }
      } else {
        if (!textSlide || textSlide.id !== attachmentId) return;

        if (mode === 'outlined' && !isGlobalOutlined) {
          previousGlobalNonOutlinedColorsRef.current = Object.fromEntries(
            textSlide.layers.map(layer => [
              layer.id,
              layer.backgroundColor || DEFAULT_TEXT_BACKGROUND_COLOR,
            ]),
          );
        }

        setAllTextLayersBackgroundMode(activeIndex, attachmentId, patch);
        if (mode === 'outlined') {
          setAllTextLayersBackgroundColor(
            activeIndex,
            attachmentId,
            DEFAULT_TEXT_COLOR,
          );
        } else if (isGlobalOutlined) {
          const previousColors = previousGlobalNonOutlinedColorsRef.current;
          textSlide.layers.forEach(layer => {
            updateTextLayer(activeIndex, attachmentId, layer.id, {
              backgroundColor:
                previousColors?.[layer.id] ?? DEFAULT_TEXT_BACKGROUND_COLOR,
            });
          });
        }
      }
    },
    [
      activeIndex,
      attachmentId,
      isGlobalOutlined,
      selectedLayerId,
      setAllTextLayersBackgroundColor,
      setAllTextLayersBackgroundMode,
      textSlide,
      updateTextLayer,
    ],
  );

  const modeButtons: Array<{id: BackgroundMode; label: string}> = [
    {id: 'defaultPill', label: 'Classic'},
    {id: 'none', label: 'No Background'},
    {id: 'square', label: 'Square'},
    {id: 'rounded', label: 'Rounded'},
    {id: 'outlined', label: 'Outlined'},
  ];

  return (
    <footer
      className="z-5000 flex h-[24%] flex-col rounded-t-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
      style={{
        backgroundColor: appColors.bottomMenuBackground,
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
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
          Text Background
        </h3>
      </div>
      <div
        className="scrollbar-hide mx-2 flex overflow-x-auto"
        style={{WebkitOverflowScrolling: 'touch'}}>
        {modeButtons.map(({id, label}) => {
          const isSelected = selectedMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleModeSelect(id)}
              className="mx-1.5 shrink-0 rounded-lg border px-4 py-2 shadow-sm transition-opacity duration-180 active:opacity-50"
              style={{
                backgroundColor: isSelected ? '#ff4800' : appColors.buttonColor,
                borderColor: isSelected ? '#ff4800' : 'rgb(209 213 219)',
              }}>
              <p
                className="text-sm font-medium text-nowrap"
                style={{
                  color: isSelected ? '#ffffff' : appColors.textColor,
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
