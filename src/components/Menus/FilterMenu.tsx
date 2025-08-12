import React, {useEffect, useMemo, useState} from 'react';
import {appStore} from '../../store/appStore';
import {getVideoThumbnail} from '../../helpers/filter_helper';
import ClipLoader from 'react-spinners/ClipLoader';
import FallbackTumb from '../../assets/fallback_thumbnail.png';
import {FILTERS} from '../../assets/filters/filterData';
import type {FilterItem} from '../../types/filterTypes';

/**
 * The FilterMenu component renders a menu of filters at the bottom of the screen.
 *
 * It shows a scrollable list of filter options, each with a preview image and name.
 * When a filter is selected, it is applied to the current media files.
 *
 * Also sets the editor prsets state.
 *
 * The component also shows a loading indicator when a filter is being applied.
 *
 * @returns {React.JSX.Element} The FilterMenu component.
 */
export const FilterMenu = (): React.JSX.Element => {
  const mediaFiles = appStore(state => state.mediaFiles);
  const isApplyingFilter = appStore(state => state.isApplyingFilter);
  const setActiveFilter = appStore(state => state.setActiveFilter);
  const videoThumbnailButton = appStore(state => state.videoThumbnailButton);
  const setVideoThumbnailButton = appStore(
    state => state.setVideoThumbnailButton,
  );
  const resetEditorState = appStore(state => state.resetEditorState);

  // local UI state
  const [videoThumbnail, setVideoThumbnail] = useState<string | undefined>(
    undefined,
  );
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState<boolean>(false);
  const [applying, setApplying] = useState(false);

  // pick the first file for thumbnail
  const firstFile = mediaFiles[0];

  // Get file type for the first file inthe mediaFiles array
  const fileType = useMemo(() => {
    if (!firstFile) {
      return 'unknown';
    }
    return firstFile.type.startsWith('video/') ? 'video' : 'image';
  }, [firstFile]);

  // Effect toGenerate video thumbnail
  useEffect(() => {
    if (!firstFile || !firstFile.type.startsWith('video/')) {
      setVideoThumbnail(undefined);
      setIsLoadingThumbnail(false);
      return;
    }

    // Check cache and reuse thumbnail if originalFiles unchanged
    if (
      videoThumbnailButton &&
      mediaFiles.length > 0 &&
      mediaFiles[0] === firstFile
    ) {
      setVideoThumbnail(videoThumbnailButton);
      setIsLoadingThumbnail(false);
      return;
    }

    const generateThumbnail = async () => {
      setIsLoadingThumbnail(true);
      try {
        const thumbnail = await getVideoThumbnail(firstFile, 0.5);
        setVideoThumbnail(thumbnail);
        setVideoThumbnailButton(thumbnail); // cache thumbnail
      } catch (err) {
        console.error('Thumbnail generation failed:', err);
      } finally {
        setIsLoadingThumbnail(false);
      }
    };

    generateThumbnail();
  }, [firstFile, videoThumbnailButton, mediaFiles, setVideoThumbnailButton]);

  const onSelectLut = async (filter: FilterItem | null) => {
    if (applying || isApplyingFilter) return;
    // “null” resets back to originals
    if (!filter) {
      return;
    }

    try {
      setApplying(true);
      // apply Filter
      await setActiveFilter(filter);
      // reset Editor
      const params = filter.params;
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
    } catch (err) {
      console.error('Failed to apply LUT:', err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <footer className="fixed right-0 bottom-0 left-0 h-[23%] rounded-t-lg border-t border-gray-800 bg-white backdrop-blur-lg">
      {/* Filters title */}
      <div className="py-4 text-center">
        <h3 className="text-lg font-medium text-black">Filters</h3>
      </div>

      {/* Scrollable filter options */}
      <div className="px-4 pb-8">
        <div className="scrollbar-hide flex space-x-4 overflow-x-auto">
          {FILTERS.map((filter: FilterItem, index) => (
            <div
              key={`${filter.key}-${index}`}
              className="flex flex-shrink-0 flex-col items-center text-justify">
              <button
                className="relative flex transform touch-manipulation appearance-none flex-col items-center border-none bg-transparent p-0 transition-transform duration-150 ease-in-out select-none focus:outline-none active:scale-95"
                onClick={() => onSelectLut(filter)}
                disabled={applying || isApplyingFilter}>
                {/* Filter preview image */}
                <div
                  className={`mb-2 h-16 w-16 overflow-hidden rounded-lg border-2`}>
                  {fileType === 'video' ? (
                    isLoadingThumbnail || isApplyingFilter ? (
                      <div className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center">
                        <ClipLoader
                          size={10}
                          color="#FF4800"
                          className="z-10"
                        />
                      </div>
                    ) : (
                      <img
                        className="h-full w-full rounded-lg object-cover"
                        src={
                          !videoThumbnail && !isLoadingThumbnail
                            ? FallbackTumb
                            : videoThumbnail
                        }
                        alt="Video thumbnail"
                      />
                    )
                  ) : (
                    <img
                      className="h-full w-full rounded-lg object-cover"
                      src={URL.createObjectURL(firstFile)}
                      alt="Image thumbnail"
                    />
                  )}
                </div>
              </button>
              {/* Filter name */}
              <span className={`text-center text-xs font-medium text-black`}>
                {filter.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};
