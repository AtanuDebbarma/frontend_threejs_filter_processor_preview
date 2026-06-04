import React, {useEffect, useMemo, useState} from 'react';
import {appStore} from '@/store/appStore';
import {getVideoThumbnail} from '@/features/post/helpers/filter/filter_helper';
import {Loader} from '@/shared/components/Loader';
import {FILTERS, CATEGORY_GRADIENTS} from '@/assets/filters/filterData';
import type {FilterItem} from '@/shared/types/filterTypes';
import {MenuBackButtonRow} from '@/shared/components/MenuBackButton';
import type {AppColors, Insets} from '@/shared/types/webBridgeTypes';
import {rnLogger} from '@/shared/utils/rnLogger';

type Props = {
  appColors: AppColors;
  safeInsets: Insets;
};

/**
 * Get gradient CSS for a filter category
 */
const getGradientStyle = (category: string): string => {
  const colors = CATEGORY_GRADIENTS[category];
  if (!colors || colors.length < 2) {
    return 'transparent';
  }
  return `linear-gradient(135deg, ${colors[0]}80, ${colors[1]}80)`;
};

export const FilterMenu = ({
  appColors,
  safeInsets,
}: Props): React.JSX.Element => {
  const mediaFiles = appStore(state => state.mediaFiles);
  const activeIndex = appStore(state => state.activeIndex);
  const isApplyingFilter = appStore(state => state.isApplyingFilter);
  const setActiveFilter = appStore(state => state.setActiveFilter);
  const setThumbCache = appStore(state => state.setThumbCache);
  const resetEditorState = appStore(state => state.resetEditorState);
  const setActiveButton = appStore(state => state.setActiveButton);

  const [videoThumbnail, setVideoThumbnail] = useState<string | undefined>(
    undefined,
  );
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState<boolean>(false);
  const [applying, setApplying] = useState(false);

  const activeFile = mediaFiles[activeIndex];

  const fileType = useMemo(() => {
    if (!activeFile) {
      return 'unknown';
    }
    return activeFile.mediaType === 'video' ? 'video' : 'image';
  }, [activeFile]);

  useEffect(() => {
    if (!activeFile || activeFile.mediaType !== 'video') {
      setVideoThumbnail(undefined);
      setIsLoadingThumbnail(false);
      return;
    }

    const cached = appStore.getState().thumbCache.get(activeIndex);
    if (cached) {
      setVideoThumbnail(cached);
      setIsLoadingThumbnail(false);
      return;
    }

    let mounted = true;
    setIsLoadingThumbnail(true);
    void (async () => {
      try {
        const thumbnail = await getVideoThumbnail(
          activeFile.uri,
          activeIndex,
          0.5,
          1080,
          appStore.getState().thumbCache,
          setThumbCache,
        );
        if (mounted) {
          setVideoThumbnail(thumbnail);
        }
      } catch (err) {
        rnLogger.componentLog(
          'FilterMenu',
          'error',
          `Thumbnail generation failed: ${err}`,
        );
        if (mounted) {
          setVideoThumbnail(undefined);
        }
      } finally {
        if (mounted) {
          setIsLoadingThumbnail(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeFile?.id,
    activeFile?.uri,
    activeFile?.mediaType,
    activeIndex,
    setThumbCache,
  ]);

  const onSelectLut = async (filter: FilterItem | null) => {
    if (applying || isApplyingFilter) return;
    if (!filter) return;

    try {
      setApplying(true);
      await setActiveFilter(filter);
      const params = filter.params;
      mediaFiles.forEach((_, index) => {
        resetEditorState(index, {
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
        });
      });
    } catch (err) {
      rnLogger.componentLog(
        'FilterMenu',
        'error',
        `Failed to apply LUT: ${err}`,
      );
    } finally {
      setApplying(false);
    }
  };

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setTimeout(() => {
      setActiveButton('mainMenu');
    }, 200);
  };

  return (
    <footer
      className="z-5000 flex flex-col rounded-t-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
      style={{
        backgroundColor: appColors.bottomMenuBackground,
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      <MenuBackButtonRow
        onClick={handleBack}
        wrapperClassName="flex items-center px-4 py-3"
      />

      <div className="-mt-4 flex w-full flex-col">
        <div className="w-full pt-0 pb-3 text-center">
          <h3
            className="text-lg font-medium"
            style={{color: appColors.textColor}}>
            Filters
          </h3>
        </div>

        <div className="w-full overflow-hidden pb-6">
          <div
            className="flex space-x-4 overflow-x-auto px-4"
            style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            {FILTERS.map((filter: FilterItem, index) => (
              <div
                key={`${filter.key}-${index}`}
                className="flex shrink-0 flex-col items-center">
                <button
                  className="relative flex transform touch-manipulation appearance-none flex-col items-center border-none bg-transparent p-0 transition-transform duration-180 ease-in-out select-none focus:outline-none active:scale-95"
                  onClick={() => onSelectLut(filter)}
                  disabled={applying || isApplyingFilter}>
                  <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-lg border-2 border-gray-500">
                    {fileType === 'video' ? (
                      isLoadingThumbnail || isApplyingFilter ? (
                        <div className="flex h-full w-full items-center justify-center">
                          <Loader size={10} color="#FF4800" className="z-10" />
                        </div>
                      ) : (
                        <>
                          <img
                            className="h-full w-full rounded-lg object-cover"
                            src={videoThumbnail}
                            alt="Video thumbnail"
                          />
                          {/* Gradient overlay */}
                          {filter.category !== 'None' && (
                            <div
                              className="pointer-events-none absolute inset-0 rounded-lg"
                              style={{
                                background: getGradientStyle(filter.category),
                                mixBlendMode: 'overlay',
                              }}
                            />
                          )}
                        </>
                      )
                    ) : (
                      <>
                        <img
                          className="h-full w-full rounded-lg object-cover"
                          src={activeFile?.uri}
                          alt="Image thumbnail"
                        />
                        {/* Gradient overlay */}
                        {filter.category !== 'None' && (
                          <div
                            className="pointer-events-none absolute inset-0 rounded-lg"
                            style={{
                              background: getGradientStyle(filter.category),
                              mixBlendMode: 'overlay',
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </button>
                <span
                  className="text-center text-xs font-medium"
                  style={{
                    color: appColors.textColor,
                  }}>
                  {filter.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
