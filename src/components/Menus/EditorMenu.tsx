// src/components/Menus/EditorMenu.tsx
import React, {useState} from 'react';
import {
  EditableFilters,
  type EditorFilter,
} from '../../assets/filters/editorData';
import {appStore} from '../../store/appStore';
import {
  getEditorSliderBinding,
  getColorBalanceBinding,
} from '../../helpers/editor_helpers';
import type {ColorBalance} from '../../types/filterTypes';

type Views = 'Editor' | EditorFilter['name'];

export const EditorMenu = (): React.JSX.Element => {
  const [view, setView] = useState<Views>('Editor');
  const activeFilter = appStore(state => state.activeFilter);
  const resetEditorState = appStore(state => state.resetEditorState);

  // Zustand selectors: always called unconditionally
  const brightness = appStore(state => state.brightness);
  const contrast = appStore(state => state.contrast);
  const saturation = appStore(state => state.saturation);
  const gamma = appStore(state => state.gamma);
  const hue = appStore(state => state.hue);
  const colorBalance: ColorBalance = appStore(state => state.colorBalance);
  const sharpness = appStore(state => state.sharpness);
  const shadows = appStore(state => state.shadows);
  const highlights = appStore(state => state.highlights);
  const temperature = appStore(state => state.temperature);
  const blur = appStore(state => state.blur);

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
    storeValues,
    storeSetters,
  );

  // Get color balance bindings (separate UI)
  const colorBinding = getColorBalanceBinding(
    {
      r: colorBalance.r ?? 0,
      g: colorBalance.g ?? 0,
      b: colorBalance.b ?? 0,
    },
    setColorBalance,
  );

  // Reset editor state to active filter params (no scaling)
  const reset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!activeFilter) return;
    const params = activeFilter.params;
    resetEditorState({
      brightness: params.brightness ?? 0,
      contrast: params.contrast ?? 1,
      saturation: params.saturation ?? 1,
      gamma: params.gamma ?? 1,
      hue: params.hue ?? 0,
      colorBalance: params.colorBalance ?? {r: 0, g: 0, b: 0},
      sharpness: params.unsharp?.amount ?? 0,
      shadows: params.shadows ?? 0,
      highlights: params.highlights ?? 0,
      temperature: params.temperature ?? 0,
      blur: params.blur ?? 0,
    });
  };

  return (
    <footer
      className={`fixed right-0 bottom-0 left-0 flex ${
        view !== 'Color Balance' ? 'h-[23%]' : 'h-[30%]'
      } flex-col rounded-t-lg border-t border-gray-800 bg-white backdrop-blur-lg`}>
      <div
        className={`${view === 'Color Balance' ? 'pt-2 pb-2' : 'py-4'} text-center`}>
        <h3 className="text-md font-medium text-black">{view}</h3>
      </div>

      {view === 'Editor' ? (
        <>
          <div className="scrollbar-hide mx-2 flex space-x-4 overflow-x-auto">
            {EditableFilters.map((editor, idx) => (
              <button
                key={`${editor.key}-${idx}`}
                onClick={() => setView(editor.name)}
                className="mx-1.5 flex-1 rounded-lg border border-gray-300 bg-gray-200 px-4 py-2 shadow-sm transition active:bg-gray-200 active:shadow-inner">
                <p className="font-md text-sm text-nowrap text-gray-700">
                  {editor.name}
                </p>
              </button>
            ))}
          </div>

          <div className="align-center mt-4 flex w-full justify-center">
            <button
              className="align-center font-md flex w-[30%] justify-center rounded-lg border border-gray-300 bg-[#ff4800] px-5 py-1 text-white shadow-sm transition active:bg-gray-200 active:shadow-inner"
              onClick={reset}>
              Reset
            </button>
          </div>
        </>
      ) : view === 'Color Balance' ? (
        <div className="flex w-full flex-col items-center gap-4 px-4">
          {(['r', 'g', 'b'] as const).map(channel => (
            <div key={channel} className="flex w-full flex-row items-center">
              <span className="mr-2 text-sm text-gray-700">
                {channel.toUpperCase()}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={colorBinding.values[channel]}
                onChange={e =>
                  colorBinding.setValue(channel, Number(e.target.value))
                }
                className="w-full"
              />
            </div>
          ))}

          <button
            onClick={() => setView('Editor')}
            className="font-md rounded-lg border border-gray-300 bg-gray-200 px-4 py-1 text-sm text-gray-700">
            Back
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center px-4">
          <input
            type="range"
            min={sliderBinding.min}
            max={sliderBinding.max}
            step={1}
            value={sliderBinding.value}
            onChange={e => sliderBinding.onChange(Number(e.target.value))}
            className="w-full"
          />

          <button
            onClick={() => setView('Editor')}
            className="font-md mt-4 rounded-lg border border-gray-300 bg-gray-200 px-4 py-1 text-gray-700">
            Back
          </button>
        </div>
      )}
    </footer>
  );
};
