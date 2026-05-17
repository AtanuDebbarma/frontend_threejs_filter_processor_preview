// src/components/Menus/AdjustMenu.tsx
import React, {useEffect, useState, useRef, useMemo} from 'react';
import {appStore} from '../../store/appStore';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {getVideoThumbnail} from '../../helpers/filter_helper';
import ClipLoader from 'react-spinners/ClipLoader';
import {useGesture} from '@use-gesture/react';
import {useElementSize} from '../../hooks/useElementSize';
import Sketch from '@uiw/react-color-sketch';
import {mat4} from 'gl-matrix';
import {
  defaultAdjustTransform,
  type AdjustRecord,
} from '../../store/adjustSlice';
import type {Insets} from '../../App';
import {rnLogger} from '../../utils/rnLogger';

type Props = {
  post: boolean;
  safeInsets: Insets;
};

export const AdjustMenu = ({
  post = true,
  safeInsets,
}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const mediaFiles = appStore(state => state.mediaFiles);
  const activeIndex = appStore(state => state.activeIndex);
  const thumbCache = appStore(state => state.thumbCache);
  const setThumbCache = appStore(state => state.setThumbCache);
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
  const [videoThumbnail, setVideoThumbnail] = useState<string | undefined>();
  const [isLoadingThumb, setIsLoadingThumb] = useState(false);
  const [baseFitScale, setBaseFitScale] = useState(1);
  const [isTagSelectionLocked, setIsTagSelectionLocked] = useState(false);

  const activeFile = mediaFiles[activeIndex];
  const imgRef = useRef<HTMLImageElement>(null);
  const {ref: previewRef, size: previewSize} = useElementSize<HTMLDivElement>();
  const tagSelectionTimeoutRef = useRef<any | null>(null);

  const [position, setPosition] = useState({x: 0, y: 0});
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const displayScale = useMemo(() => {
    if (!activeFile || !previewSize?.width || !previewSize?.height) {
      return {x: 1, y: 1};
    }

    const mediaAspect = activeFile.width / activeFile.height;
    const previewAspect = previewSize.width / previewSize.height;

    let displayedWidth: number, displayedHeight: number;

    if (post) {
      if (mediaAspect > previewAspect) {
        displayedHeight = previewSize.height;
        displayedWidth = displayedHeight * mediaAspect;
      } else {
        displayedWidth = previewSize.width;
        displayedHeight = displayedWidth / mediaAspect;
      }
    } else {
      if (mediaAspect > previewAspect) {
        displayedWidth = previewSize.width;
        displayedHeight = displayedWidth / mediaAspect;
      } else {
        displayedHeight = previewSize.height;
        displayedWidth = displayedHeight * mediaAspect;
      }
    }

    return {
      x: activeFile.width / displayedWidth,
      y: activeFile.height / displayedHeight,
    };
  }, [activeFile, previewSize, post]);

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

  useEffect(() => {
    if (!activeFile || !previewSize?.width || !previewSize?.height) return;

    const mediaAspect = activeFile.width / activeFile.height;
    const previewAspect = previewSize.width / previewSize.height;

    let scale;
    if (post) {
      scale =
        mediaAspect > previewAspect
          ? previewSize.height / activeFile.height
          : previewSize.width / activeFile.width;
    } else {
      scale =
        mediaAspect > previewAspect
          ? previewSize.width / activeFile.width
          : previewSize.height / activeFile.height;
    }

    setBaseFitScale(scale);
  }, [activeFile, previewSize, post]);

  useEffect(() => {
    if (!activeFile || activeFile.mediaType !== 'video') {
      setVideoThumbnail(undefined);
      return;
    }
    let mounted = true;
    (async () => {
      setIsLoadingThumb(true);
      try {
        const thumb = await getVideoThumbnail(
          activeFile.uri,
          activeIndex,
          0.5,
          1080,
          thumbCache,
          setThumbCache,
        );
        if (mounted) setVideoThumbnail(thumb);
      } catch (err) {
        rnLogger.componentLog(
          'AdjustMenu',
          'error',
          `Failed to get video thumbnail, ${err}`,
        );
      } finally {
        if (mounted) setIsLoadingThumb(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeFile, activeIndex, thumbCache, setThumbCache]);

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
        tagMode && !isModalOpen
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
      target: imgRef,
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
      setActiveButton(null);
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
      const targetWidth = 1080;
      const targetHeight = post ? 1350 : 1920;
      const targetAspect = targetWidth / targetHeight;
      const mediaAspect = activeFile.width / activeFile.height;

      const projection = mat4.create();
      mat4.ortho(projection, -1, 1, -1, 1, -1, 1);

      // ✅ IMPROVED: Handle both wide and tall images
      let quadScaleX = 1.0;
      let quadScaleY = 1.0;

      if (mediaAspect > targetAspect) {
        // Wide image in tall container (e.g., 16:9 image in 4:5 post)
        quadScaleX = mediaAspect / targetAspect;
        quadScaleY = 1.0;
        if (quadScaleX > 1.0) {
          quadScaleY = 1.0 / quadScaleX;
          quadScaleX = 1.0;
        }
      } else {
        // Tall image in wide container (e.g., 4:5 image in 16:9 story)
        quadScaleY = targetAspect / mediaAspect;
        quadScaleX = 1.0;
        if (quadScaleY > 1.0) {
          quadScaleX = 1.0 / quadScaleY;
          quadScaleY = 1.0;
        }
      }

      const scaleFactorX = targetWidth / activeFile.width;
      const scaleFactorY = targetHeight / activeFile.height;

      const worldX = position.x;
      const worldY = position.y;

      const normalizedX = ((worldX * scaleFactorX) / targetWidth) * 2.0;
      const normalizedY = -((worldY * scaleFactorY) / targetHeight) * 2.0;

      const rotRad = -(rotation * Math.PI) / 180.0;

      const model = mat4.create();
      mat4.translate(model, model, [normalizedX, normalizedY, 0]);
      mat4.rotateZ(model, model, rotRad);
      mat4.scale(model, model, [scale * quadScaleX, scale * quadScaleY, 1]);

      const mvp = mat4.create();
      mat4.multiply(mvp, projection, model);

      setAdjustTransform(activeIndex, currentActiveId, {
        x: position.x / activeFile.width,
        y: position.y / activeFile.height,
        scale: scale,
        rotation: rotation,
        bgColor: localBgColor,
        mvp: Array.from(mvp),
      });

      rnLogger.log('✅ MVP Matrix (Export Space):', mvp);
      rnLogger.log(
        `Target: ${targetWidth}×${targetHeight}, Media: ${activeFile.width}×${activeFile.height}`,
      );
      rnLogger.log(
        `Aspect: media=${mediaAspect.toFixed(3)}, target=${targetAspect.toFixed(3)}`,
      );
      rnLogger.log(
        `QuadScale: X=${quadScaleX.toFixed(3)}, Y=${quadScaleY.toFixed(3)}`,
      );
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

  const aspect = `${post ? 'aspect-4/5' : 'aspect-9/16'}`;
  const closeTop = `${post ? 'top-8 left-7' : 'left-7 top-8'}`;

  return (
    <div
      className="absolute right-0 bottom-0 left-0 z-5000 h-[100%] rounded-lg bg-[rgba(0,0,0,0.8)] px-0 backdrop-blur-lg"
      onClick={() => setShowColorPicker(false)}
      style={{
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      <button
        onClick={handleBack}
        className={`absolute ${closeTop} z-1000 -translate-x-1/2 -translate-y-1/2 rounded-full border-1 border-gray-100/20 bg-black/40 p-1 text-sm text-white hover:bg-black/80`}>
        <FontAwesomeIcon icon={faXmark} size="lg" color="white" />
      </button>

      <div
        ref={previewRef}
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-[8px] border-1 ${aspect}`}
        style={{backgroundColor: localBgColor}}>
        {activeFile ? (
          activeFile.mediaType === 'video' ? (
            isLoadingThumb ? (
              <ClipLoader size={30} color="#FF4800" />
            ) : (
              videoThumbnail && (
                <img
                  ref={imgRef}
                  src={videoThumbnail}
                  alt="video thumbnail"
                  className="touch-none select-none"
                  style={{
                    maxWidth: 'none',
                    maxHeight: 'none',
                    transform: `
                    translate(${position.x / displayScale.x}px, ${position.y / displayScale.y}px)
                    scale(${baseFitScale * scale})
                    rotate(${rotation}deg)
                    `,
                    transformOrigin: 'center center',
                    touchAction: 'none',
                  }}
                  draggable={false}
                />
              )
            )
          ) : (
            <img
              ref={imgRef}
              src={activeFile.uri}
              alt="image preview"
              className="touch-none select-none"
              style={{
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `
                translate(${position.x / displayScale.x}px, ${position.y / displayScale.y}px)
                scale(${baseFitScale * scale})
                rotate(${rotation}deg)
                `,
                transformOrigin: 'center center',
                touchAction: 'none',
              }}
              draggable={false}
            />
          )
        ) : (
          <p className="text-white">No media</p>
        )}

        {/* Tags rendered inside preview container */}
        {tagValuesByIndex[activeIndex].tags?.map(tag => (
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
            <span className="mr-1 max-w-[100px] min-w-[30px] truncate overflow-hidden font-medium text-ellipsis whitespace-nowrap">
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
      </div>

      {!tagMode && (
        <>
          <div className="mt-8 flex w-full flex-row items-center justify-center gap-2">
            <button
              onClick={reset}
              className="z-1000 flex w-28 items-center justify-center rounded-[10px] border-1 border-gray-100/20 bg-gray-500 p-4 text-sm font-medium text-white transition-opacity duration-180 hover:bg-gray-700 active:opacity-50">
              Reset
            </button>
            <button
              onClick={handleConfirm}
              className="z-1000 flex w-28 items-center justify-center rounded-[10px] border-1 border-gray-100/20 bg-[#ff4800] p-4 text-sm font-medium text-white transition-opacity duration-180 hover:bg-[#ff4800]/80 active:opacity-50">
              Confirm
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="font-regular z-1000 flex w-28 items-center justify-center rounded-[10px] border-1 border-gray-100/20 bg-gray-500 p-4 text-sm text-white transition-opacity duration-180 hover:bg-gray-700 active:opacity-50">
              Background
            </button>
          </div>
        </>
      )}

      {showColorPicker && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute bottom-20 left-1/2 z-1000 -translate-x-1/2 rounded-lg bg-white p-2 shadow-lg">
          <Sketch
            color={localBgColor}
            width={300}
            onChange={(color: any) => setLocalBgColor(color.hex)}
          />
        </div>
      )}
    </div>
  );
};
