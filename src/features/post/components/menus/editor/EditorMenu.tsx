// src/components/Menus/EditorMenu.tsx
import React, {useState} from 'react';
import {EditableFilters, type EditorFilter} from '@/assets/filters/editorData';
import {appStore} from '@/store/appStore';
import {
  getEditorSliderBinding,
  getColorBalanceBinding,
  inlineStyle,
} from '@/features/post/helpers/menus/editor_helpers';
import type {ColorBalance} from '@/shared/types/filterTypes';
import {faArrowLeft} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {defaultEditor, type EditorRecord} from '@/store/editorSlice';
import type {AppColors, Insets} from '@/shared/types/webBridgeTypes';

type Views = 'Editor' | EditorFilter['name'];

type resetParams = {
  e: React.MouseEvent<HTMLButtonElement>;
  global?: boolean;
  overallByIndex?: boolean;
  single?: boolean;
};
type Props = {
  appColors: AppColors;
  safeInsets: Insets;
};

export const EditorMenu = ({
  appColors,
  safeInsets,
}: Props): React.JSX.Element => {
  const [view, setView] = useState<Views>('Editor');
  const activeFilter = appStore(state => state.activeFilter);
  const mediaFiles = appStore(state => state.mediaFiles);
  const activeIndex = appStore(state => state.activeIndex);
  const resetEditorState = appStore(state => state.resetEditorState);
  const setActiveButton = appStore(state => state.setActiveButton);

  // Zustand selectors: always called unconditionally
  const editorByIndex: EditorRecord = appStore(state => state.editorByIndex);
  const currentSelected = editorByIndex[activeIndex].value ?? defaultEditor;
  const currentSelectedID = mediaFiles[activeIndex].id;

  const brightness = currentSelected.brightness ?? 0.0;
  const contrast = currentSelected.contrast ?? 1.0;
  const saturation = currentSelected.saturation ?? 1.0;
  const gamma = currentSelected.gamma ?? 1.0;
  const hue = currentSelected.hue ?? 0.0;
  const colorBalance: ColorBalance = currentSelected.colorBalance ?? {
    r: 0.0,
    g: 0.0,
    b: 0.0,
  };
  const sharpness = currentSelected.sharpness ?? 0.0;
  const shadows = currentSelected.shadows ?? 0.0;
  const highlights = currentSelected.highlights ?? 0.0;
  const temperature = currentSelected.temperature ?? 0.0;
  const blur = currentSelected.blur ?? 0.0;

  const setBrightness = appStore(state => state.setBrightness);
  const setContrast = appStore(state => state.setContrast);
  const setSaturation = appStore(state => state.setSaturation);
  const setGamma = appStore(state => state.setGamma);
  const setHue = appStore(state => state.setHue);
  const setColorBalance = appStore(state => state.setColorBalance);
  const setSharpness = appStore(state => state.setSharpness);
  const setShadows = appStore(state => state.setShadows);
  const setHighlights = appStore(state => state.setHighlights);
  const setTemperature = appStore(state => state.setTemperature);
  const setBlur = appStore(state => state.setBlur);

  const storeValues = {
    brightness,
    contrast,
    saturation,
    gamma,
    hue,
    sharpness,
    shadows,
    highlights,
    temperature,
    blur,
  };
  const storeSetters = {
    brightness: setBrightness,
    contrast: setContrast,
    saturation: setSaturation,
    gamma: setGamma,
    hue: setHue,
    sharpness: setSharpness,
    shadows: setShadows,
    highlights: setHighlights,
    temperature: setTemperature,
    blur: setBlur,
  };

  // Find selected editor key
  const currentFilter = EditableFilters.find(f => f.name === view) ?? null;
  const bindingKey = currentFilter?.key ?? 'brightness';

  // Get slider binding for the current key (except colorBalance)
  const sliderBinding = getEditorSliderBinding(
    bindingKey,
    activeIndex,
    storeValues,
    storeSetters,
    currentSelectedID,
  );

  // Get color balance bindings (separate UI)
  const colorBinding = getColorBalanceBinding(
    {
      r: colorBalance.r ?? 0.0,
      g: colorBalance.g ?? 0.0,
      b: colorBalance.b ?? 0.0,
    },
    activeIndex,
    setColorBalance,
    currentSelectedID,
  );

  const reset = ({
    e,
    global = false,
    overallByIndex = false,
    single = false,
  }: resetParams) => {
    e.preventDefault();
    if (!activeFilter) return;
    const params = activeFilter.params;

    const mappedParams = {
      brightness: params.brightness ?? 0.0,
      contrast: params.contrast ?? 1.0,
      saturation: params.saturation ?? 1.0,
      gamma: params.gamma ?? 1.0,
      hue: params.hue ?? 0.0,
      colorBalance: params.colorBalance ?? {r: 0.0, g: 0.0, b: 0.0},
      sharpness: params.unsharp?.amount ?? 0.0,
      shadows: params.shadows ?? 0.0,
      highlights: params.highlights ?? 0.0,
      temperature: params.temperature ?? 0.0,
      blur: params.blur ?? 0.0,
    };

    if (global) {
      // Reset ALL indexes (all media items) back to activeFilter params
      mediaFiles.forEach((_, index) => {
        resetEditorState(index, mappedParams);
      });
    } else if (overallByIndex) {
      // Reset ALL sliders for the CURRENT activeIndex
      resetEditorState(activeIndex, mappedParams);
    } else if (single && currentFilter) {
      // Reset ONLY the current slider (e.g. brightness) for CURRENT activeIndex
      const key = currentFilter.key as keyof typeof mappedParams;
      resetEditorState(activeIndex, {
        [key]: mappedParams[key],
      });
    }
  };

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setTimeout(() => {
      if (view !== 'Editor') {
        setView('Editor');
      } else {
        setActiveButton('editorMainMenu');
      }
    }, 200);
  };

  return (
    <>
      <style>{inlineStyle}</style>
      <footer
        className={`fixed right-0 bottom-0 left-0 z-5000 flex flex-col rounded-t-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]`}
        style={{
          backgroundColor: appColors.bottomMenuBackground,
          paddingBottom: `${safeInsets.bottom + 10}px`,
        }}>
        <div className="flex items-center px-4 py-1">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-orange-600 transition-opacity duration-180 active:opacity-50">
            <FontAwesomeIcon icon={faArrowLeft} size="sm" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        <div
          className={`${view === 'Color Balance' ? 'pt-[-1.8rem] pb-2' : 'pt-[-1rem] pb-4'} text-center`}>
          <h3
            className="text-md font-medium"
            style={{
              color: appColors.textColor,
            }}>
            {view}
          </h3>
        </div>

        {view === 'Editor' ? (
          <>
            <div className="scrollbar-hide mx-2 flex space-x-4 overflow-x-auto">
              {EditableFilters.map((editor, idx) => (
                <button
                  key={`${editor.key}-${idx}`}
                  onClick={() => setView(editor.name)}
                  className="mx-1.5 flex-1 rounded-lg border border-gray-300 px-4 py-2 shadow-sm transition-opacity duration-180 active:opacity-50"
                  style={{
                    backgroundColor: appColors.buttonColor,
                  }}>
                  <p
                    className="font-md text-sm text-nowrap"
                    style={{
                      color: appColors.textColor,
                    }}>
                    {editor.name}
                  </p>
                </button>
              ))}
            </div>

            <div className="align-center mt-4 flex w-full flex-row justify-center gap-2">
              <button
                className="align-center font-md xxxs:w-[28%] flex w-[32%] justify-center rounded-lg border border-gray-300 bg-[#ff4800] px-5 py-2 text-white shadow-sm transition-opacity duration-180 active:opacity-50"
                onClick={e => reset({e, overallByIndex: true})}>
                Reset
              </button>

              <button
                className="align-center font-md xxxs:w-[28%] flex w-[32%] justify-center rounded-lg border border-gray-300 bg-gray-400 px-5 py-2 text-white shadow-sm transition-opacity duration-180 active:opacity-50"
                onClick={e => reset({e, global: true})}>
                Reset All
              </button>
            </div>
          </>
        ) : view === 'Color Balance' ? (
          <div className="flex w-full flex-col items-center gap-4 px-2">
            {(['r', 'g', 'b'] as const).map(channel => (
              <div
                key={channel}
                className="flex w-full flex-row items-center gap-3">
                <span
                  className="w-4 text-sm font-medium"
                  style={{
                    color: appColors.textColor,
                  }}>
                  {channel.toUpperCase()}
                </span>
                <input
                  type="range"
                  min={colorBinding.min}
                  max={colorBinding.max}
                  step={colorBinding.step}
                  value={colorBinding.values[channel]}
                  onChange={e =>
                    colorBinding.setValue(channel, Number(e.target.value))
                  }
                  className="flex-1"
                  style={
                    {
                      '--value': `${
                        ((colorBinding.values[channel] - colorBinding.min) /
                          (colorBinding.max - colorBinding.min)) *
                        100
                      }%`,
                    } as React.CSSProperties
                  }
                />

                <span
                  className="font-mediu w-10 text-right text-sm"
                  style={{
                    color: appColors.textColor,
                  }}>
                  {colorBinding.values[channel].toFixed(2)}
                </span>
              </div>
            ))}
            <div className="align-center xxxs:mt-1 mt-[-0.2rem] flex w-full justify-center">
              <button
                className="align-center font-md xxxs:w-[40%] flex w-[45%] justify-center rounded-lg border border-gray-300 bg-[#ff4800] px-5 py-2 text-white shadow-sm transition-opacity duration-180 active:opacity-50"
                onClick={e => reset({e, single: true})}>
                Reset Current
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-4 px-4">
            <div className="flex w-full flex-row items-center gap-3 px-2">
              <input
                type="range"
                min={sliderBinding.min}
                max={sliderBinding.max}
                step={sliderBinding.step}
                value={sliderBinding.value}
                onChange={e => sliderBinding.onChange(Number(e.target.value))}
                className="flex-1"
                style={
                  {
                    '--value': `${
                      ((sliderBinding.value - sliderBinding.min) /
                        (sliderBinding.max - sliderBinding.min)) *
                      100
                    }%`,
                  } as React.CSSProperties
                }
              />
              <span
                className="w-12 text-right text-sm font-medium"
                style={{
                  color: appColors.textColor,
                }}>
                {sliderBinding.value.toFixed(2)}
              </span>
            </div>
            <div className="align-center mt-4 flex w-full justify-center">
              <button
                className="align-center font-md xxxs:w-[40%] flex w-[48%] justify-center rounded-lg border border-gray-300 bg-[#ff4800] px-5 py-2 text-white shadow-sm transition-opacity duration-180 active:opacity-50"
                onClick={e => reset({e, single: true})}>
                Reset Current
              </button>
            </div>
          </div>
        )}
      </footer>
    </>
  );
};
