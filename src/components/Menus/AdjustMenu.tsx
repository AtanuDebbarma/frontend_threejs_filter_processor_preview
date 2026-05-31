// src/components/Menus/AdjustMenu.tsx
import React, {useEffect, useState, useRef, useMemo} from 'react';
import {LazySketchColorPicker} from '@/components/shared/LazySketchColorPicker';
import {useThrottledHexCommit} from '@/hooks/useThrottledHexCommit';
import {appStore} from '../../store/appStore';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useGesture} from '@use-gesture/react';
import {useAdjustPreviewLayout} from '../../hooks/useAdjustPreviewLayout';
import {AdjustPreviewFrame} from './shared/AdjustPreviewFrame';
import {
  defaultAdjustTransform,
  type AdjustRecord,
} from '../../store/adjustSlice';
import type {ExportMode, Insets} from '../../App';
import {rnLogger} from '../../utils/rnLogger';
import {isPostLayoutMode} from '@/helpers/exportTypes';

type Props = {
  exportMode: ExportMode;
  safeInsets: Insets;
};

export const AdjustMenu = ({
  exportMode,
  safeInsets,
}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const mediaFiles = appStore(state => state.mediaFiles);
  const activeIndex = appStore(state => state.activeIndex);
  const tagMode = appStore(state => state.tagMode);
  const setTagMode = appStore(state => state.setTagMode);
  const addTagToIndex = appStore(state => state.addTagToIndex);
  const tagValuesByIndex = appStore(state => state.tagValuesByIndex);
  const removeTagAtIndex = appStore(state => state.removeTagAtIndex);
  const currentActiveId: string = mediaFiles[activeIndex]?.id;
  const adjustByIndex: AdjustRecord = appStore(state => state.adjustByIndex);
  const isModalOpen = appStore(state => state.isModalOpen);

  const currentStoreAdjust =
    adjustByIndex[activeIndex].value ?? defaultAdjustTransform;
  const setAdjustTransform = appStore(state => state.setAdjustTransform);

  const [localBgColor, setLocalBgColor] = useState<string>(
    defaultAdjustTransform.bgColor,
  );
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isTagSelectionLocked, setIsTagSelectionLocked] = useState(false);

  const activeFile = mediaFiles[activeIndex];
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const tagSelectionTimeoutRef = useRef<any | null>(null);

  const [position, setPosition] = useState({x: 0, y: 0});
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const {displayScale, previewRef} = useAdjustPreviewLayout(
    exportMode,
    activeIndex,
  );

  useEffect(() => {
    if (
      activeIndex !== null &&
      currentStoreAdjust &&
      activeFile?.width &&
      activeFile?.height
    ) {
      setLocalBgColor(currentStoreAdjust.bgColor);
      setPosition({
        x: (currentStoreAdjust.x ?? 0) * activeFile.width,
        y: (currentStoreAdjust.y ?? 0) * activeFile.height,
      });
      setScale(currentStoreAdjust.scale ?? 1);
      setRotation(currentStoreAdjust.rotation ?? 0);
    }
  }, [activeIndex, currentStoreAdjust, activeFile]);

  const isPhotoSlide = activeFile?.mediaType === 'photo';

  const adjustPreviewTransform = useMemo(
    () => ({
      positionX: position.x,
      positionY: position.y,
      scale,
      rotation,
      bgColor: localBgColor,
    }),
    [position.x, position.y, scale, rotation, localBgColor],
  );
  const {
    onChange: handleAdjustBgColorChange,
    flushPending: flushAdjustBgColor,
  } = useThrottledHexCommit((hex: string) => {
    setLocalBgColor(hex);
  });

  useEffect(() => {
    if (activeFile?.mediaType === 'video' && tagMode) {
      setTagMode(false);
    }
  }, [activeFile?.mediaType, activeFile?.id, tagMode, setTagMode]);

  // Listen for messages from React Native
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'TAG_SEARCH_RESULT') {
          const {tagId, userId, assetId, username} = data.payload;

          rnLogger.componentLog(
            'AdjustMenu',
            'log',
            `Tag search result payload: ${JSON.stringify(
              data.payload,
              null,
              2,
            )}`,
          );

          // If tag search was cancelled or invalid — remove it
          if (!userId || !username) {
            removeTagAtIndex(activeIndex, currentActiveId, tagId);
            handleManualCancel(assetId, tagId);
            return;
          }

          // Otherwise update the tag with real user data
          const tag = tagValuesByIndex[activeIndex].tags?.find(
            t => t.id === tagId && tagValuesByIndex[activeIndex].id === assetId,
          );
          if (tag) {
            addTagToIndex(activeIndex, assetId, {
              ...tag,
              userId,
              username,
            });
          }
        }
      } catch (err) {
        rnLogger.componentLog(
          'AdjustMenu',
          'error',
          `Failed to parse message from React Native, ${err}`,
        );
      }
    };
    document.addEventListener('message', handleMessage as any);

    return () => document.removeEventListener('message', handleMessage as any);
  }, [
    activeIndex,
    tagValuesByIndex,
    addTagToIndex,
    removeTagAtIndex,
    currentActiveId,
  ]);

  // Gesture binding with @use-gesture/react
  useGesture(
    {
      onDrag: !tagMode
        ? ({offset: [x, y]}) => {
            setPosition({
              x: x * displayScale.x,
              y: y * displayScale.y,
            });
          }
        : undefined,
      onPinch: !tagMode
        ? ({offset: [s, a]}) => {
            setScale(s);
            setRotation(a);
          }
        : undefined,
      onClick:
        tagMode && !isModalOpen && isPhotoSlide
          ? ({event}) => {
              if (!previewRef.current || isTagSelectionLocked) return;

              // ✅ Double check modal isn't open
              if (isModalOpen) return;

              // Lock tag selection for 200ms
              setIsTagSelectionLocked(true);
              if (tagSelectionTimeoutRef.current) {
                clearTimeout(tagSelectionTimeoutRef.current);
              }
              tagSelectionTimeoutRef.current = setTimeout(() => {
                setIsTagSelectionLocked(false);
              }, 300);

              const e = event as MouseEvent;
              const containerRect = previewRef.current.getBoundingClientRect();
              const x = (e.clientX - containerRect.left) / containerRect.width;
              const y = (e.clientY - containerRect.top) / containerRect.height;

              if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
                const tagId = Date.now();
                // Find the current max z among tags for this index
                const existingTags = tagValuesByIndex[activeIndex] || [];
                const maxZ =
                  existingTags.tags.length &&
                  existingTags.id === currentActiveId
                    ? Math.max(...existingTags.tags.map(t => t.z ?? 0))
                    : 0;
                const zIndex = maxZ + 1; // ✅ define z here

                addTagToIndex(activeIndex, currentActiveId, {
                  id: tagId,
                  x: x,
                  y: y,
                  z: zIndex, // to be fixed
                  username: '',
                  userId: '',
                });

                // Send message to React Native
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(
                    JSON.stringify({
                      type: 'TAG_SEARCH',
                      payload: {
                        tagId,
                        x,
                        y,
                        zIndex: zIndex,
                        mediaIndex: activeIndex,
                        mediaID: currentActiveId,
                      },
                    }),
                  );
                }
              }
            }
          : undefined,
    },
    {
      target: mediaRef,
      drag: {
        from: () => [position.x / displayScale.x, position.y / displayScale.y],
        filterTaps: true,
        enabled: !tagMode,
      },
      pinch: {
        from: () => [scale, rotation],
        scaleBounds: {min: 0.5, max: 5},
        rubberband: true,
        enabled: !tagMode,
      },
    },
  );

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (tagMode) {
      setActiveButton('mainMenu');
      setTagMode(false);
      return;
    }
    setPosition({x: 0, y: 0});
    setScale(1);
    setRotation(0);
    setLocalBgColor(defaultAdjustTransform.bgColor);
    setTimeout(() => {
      changeButton();
    }, 200);
  };

  const changeButton = () => {
    setActiveButton('editorMainMenu');
  };

  const reset = () => {
    setTimeout(() => {
      setPosition({x: 0, y: 0});
      setScale(1);
      setRotation(0);
      setLocalBgColor(defaultAdjustTransform.bgColor);
      setAdjustTransform(activeIndex, currentActiveId, defaultAdjustTransform);
    }, 180);
  };

  const handleConfirm = () => {
    if (activeFile?.width && activeFile?.height) {
      setAdjustTransform(activeIndex, currentActiveId, {
        x: position.x / activeFile.width,
        y: position.y / activeFile.height,
        scale: scale,
        rotation: rotation,
        bgColor: localBgColor,
      });
    }

    setTimeout(() => {
      changeButton();
    }, 200);
  };

  const handleManualCancel = (activeID: string, tagId: number) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'TAG_SEARCH_CANCEL',
          payload: {
            tagId,
            mediaId: activeID,
          },
        }),
      );
    }
  };

  const closeTop = `${isPostLayoutMode(exportMode) ? 'top-8 left-7' : 'left-7 top-8'}`;

  return (
    <div
      className="absolute right-0 bottom-0 left-0 z-5000 h-full rounded-lg bg-[rgba(0,0,0,0.8)] px-0 backdrop-blur-lg"
      onClick={() => setShowColorPicker(false)}
      style={{
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      <button
        onClick={handleBack}
        className={`absolute ${closeTop} z-1000 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-100/20 bg-black/40 p-1 text-sm text-white hover:bg-black/80`}>
        <FontAwesomeIcon icon={faXmark} size="lg" color="white" />
      </button>

      <AdjustPreviewFrame
        exportMode={exportMode}
        activeIndex={activeIndex}
        transform={adjustPreviewTransform}
        mediaRef={mediaRef}>
        {/* Position tags — images only (not video adjust preview) */}
        {isPhotoSlide &&
          tagValuesByIndex[activeIndex].tags?.map(tag => (
            <div
              key={tag.id}
              className="absolute flex items-center rounded-full bg-black/60 px-3 py-2 text-sm text-white shadow-md backdrop-blur-sm transition-all duration-200 ease-in-out hover:bg-black/90"
              style={{
                left: `${tag.x * 100}%`,
                top: `${tag.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: tag.z || 1,
                animation: 'fadeInTag 0.25s ease-out',
                pointerEvents: 'auto',
              }}>
              <span className="mr-1 max-w-25 min-w-7.5 truncate overflow-hidden font-medium text-ellipsis whitespace-nowrap">
                {tag.username ? `${tag.username}` : ''}
              </span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleManualCancel(currentActiveId, tag.id);
                  removeTagAtIndex(activeIndex, currentActiveId, tag.id);
                }}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-[10px] text-white transition-transform duration-150 hover:bg-red-500 active:scale-90">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          ))}
      </AdjustPreviewFrame>

      {!tagMode && (
        <>
          <div className="mt-8 flex w-full flex-row items-center justify-center gap-2">
            <button
              onClick={reset}
              className="z-1000 flex w-28 items-center justify-center rounded-[10px] border border-gray-100/20 bg-gray-500 p-4 text-sm font-medium text-white transition-opacity duration-180 hover:bg-gray-700 active:opacity-50">
              Reset
            </button>
            <button
              onClick={handleConfirm}
              className="z-1000 flex w-28 items-center justify-center rounded-[10px] border border-gray-100/20 bg-[#ff4800] p-4 text-sm font-medium text-white transition-opacity duration-180 hover:bg-[#ff4800]/80 active:opacity-50">
              Confirm
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="font-regular z-1000 flex w-28 items-center justify-center rounded-[10px] border border-gray-100/20 bg-gray-500 p-4 text-sm text-white transition-opacity duration-180 hover:bg-gray-700 active:opacity-50">
              Background
            </button>
          </div>
        </>
      )}

      {showColorPicker && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute bottom-20 left-1/2 z-1000 -translate-x-1/2 rounded-lg bg-white p-2 shadow-lg">
          <div
            onPointerUpCapture={() => flushAdjustBgColor()}
            onPointerCancel={() => flushAdjustBgColor()}>
            <LazySketchColorPicker
              color={localBgColor}
              width={300}
              onChange={(color: {hex: string}) =>
                handleAdjustBgColorChange(color)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
