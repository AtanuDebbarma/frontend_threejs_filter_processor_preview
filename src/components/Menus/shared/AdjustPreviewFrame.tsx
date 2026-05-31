import type {AdjustPreviewMediaTransform} from '@/helpers/adjustPreviewTransform';
import {useAdjustPreviewLayout} from '@/hooks/useAdjustPreviewLayout';
import {useMenuPreviewVideo} from '@/hooks/useMenuPreviewVideo';
import {rnLogger} from '@/utils/rnLogger';
import {Loader} from '@/components/shared/Loader';
import {faTrash} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useCallback, type RefObject} from 'react';
import type {ExportMode} from '@/helpers/exportTypes';
import {isPostLayoutMode} from '@/helpers/exportTypes';

type Props = {
  exportMode: ExportMode;
  activeIndex: number;
  transform: AdjustPreviewMediaTransform;
  children?: React.ReactNode;
  mediaRef?: React.RefObject<HTMLImageElement | HTMLVideoElement | null>;
  fromText?: boolean;
  /** Text flow: show trash drop target only while dragging a layer. */
  showTextTrashDropZone?: boolean;
  /** Text flow: pointer is currently over trash hit target. */
  isTextTrashHot?: boolean;
  textTrashButtonRef?: RefObject<HTMLButtonElement | null>;
};

/**
 * Shared 4:5 / 9:16 preview box — same layout + media CSS transform as AdjustMenu.
 * Videos: non-playable <video> seeked to stored playback time (see useMenuPreviewVideo).
 */
export const AdjustPreviewFrame = ({
  exportMode,
  activeIndex,
  transform,
  children,
  mediaRef,
  fromText = false,
  showTextTrashDropZone = false,
  isTextTrashHot = false,
  textTrashButtonRef,
}: Props): React.JSX.Element => {
  const {activeFile, previewRef, displayScale, baseFitScale} =
    useAdjustPreviewLayout(exportMode, activeIndex);

  const {
    isVideo,
    photoUri,
    videoSrc,
    posterSrc,
    isLoading,
    isFrameReady,
    videoCrossOrigin,
    bindMenuPreviewVideo,
  } = useMenuPreviewVideo(activeIndex);

  const assignMediaRef = useCallback(
    (el: HTMLImageElement | HTMLVideoElement | null) => {
      if (mediaRef) {
        (
          mediaRef as React.RefObject<
            HTMLImageElement | HTMLVideoElement | null
          >
        ).current = el;
      }
    },
    [mediaRef],
  );

  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      bindMenuPreviewVideo(el);
      assignMediaRef(el);
    },
    [bindMenuPreviewVideo, assignMediaRef],
  );

  const mediaTransformStyle: React.CSSProperties = {
    maxWidth: 'none',
    maxHeight: 'none',
    transform: `
      translate(${transform.positionX / displayScale.x}px, ${transform.positionY / displayScale.y}px)
      scale(${baseFitScale * transform.scale})
      rotate(${transform.rotation}deg)
    `,
    transformOrigin: 'center center',
    touchAction: 'none',
  };

  const aspect = isPostLayoutMode(exportMode) ? 'aspect-4/5' : 'aspect-9/16';
  const showVideoSpinner = isVideo && isLoading && !posterSrc && !isFrameReady;

  return (
    <div
      ref={previewRef}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-lg border ${aspect}`}
      style={{backgroundColor: transform.bgColor}}>
      <div className="flex h-full w-full items-center justify-center">
        {activeFile ? (
          isVideo ? (
            <>
              {showVideoSpinner ? <Loader size={30} color="#FF4800" /> : null}
              {posterSrc ? (
                <img
                  ref={el => {
                    assignMediaRef(el);
                  }}
                  src={posterSrc}
                  alt="video preview frame"
                  className="touch-none select-none"
                  style={mediaTransformStyle}
                  draggable={false}
                />
              ) : null}
              {videoSrc ? (
                <video
                  ref={setVideoRef}
                  src={videoSrc}
                  muted
                  playsInline
                  preload="auto"
                  controls={false}
                  disablePictureInPicture
                  crossOrigin={videoCrossOrigin}
                  aria-label="Video preview frame"
                  className="touch-none select-none"
                  style={{
                    ...mediaTransformStyle,
                    opacity: isFrameReady ? 1 : 0,
                  }}
                  draggable={false}
                  onLoadedMetadata={e => {
                    bindMenuPreviewVideo(e.currentTarget);
                  }}
                  onLoadedData={e => {
                    bindMenuPreviewVideo(e.currentTarget);
                  }}
                  onError={ev => {
                    rnLogger.componentLog(
                      'AdjustPreviewFrame',
                      'error',
                      `Menu preview video error: ${ev}`,
                    );
                  }}
                />
              ) : null}
            </>
          ) : (
            <img
              ref={el => {
                assignMediaRef(el);
              }}
              src={photoUri}
              alt="image preview"
              className="touch-none select-none"
              style={mediaTransformStyle}
              draggable={false}
            />
          )
        ) : (
          <p className="text-white">No media</p>
        )}
      </div>
      {fromText && showTextTrashDropZone ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center justify-center gap-1.5">
          <p
            id="text-trash-drop-label"
            className="text-center text-sm font-medium tracking-wide text-white/90">
            Drag to Delete
          </p>
          <button
            ref={textTrashButtonRef}
            type="button"
            tabIndex={-1}
            aria-labelledby="text-trash-drop-label"
            aria-label="Drop here to delete text"
            className="pointer-events-none flex items-center rounded-full border-2 border-white/90 bg-black/30 px-1 py-2 text-white/90"
            onClick={e => e.preventDefault()}>
            <FontAwesomeIcon
              icon={faTrash}
              size="2x"
              className={isTextTrashHot ? 'animate-trash-shake' : undefined}
            />
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
};
