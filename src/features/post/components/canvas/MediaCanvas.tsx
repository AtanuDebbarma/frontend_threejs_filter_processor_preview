import {Canvas} from '@react-three/fiber';
import React, {useEffect, useMemo} from 'react';
import type {MediaItem} from '@/features/post/hooks/canvas/useVerifiedMediaFiles';
import {FilteredMedia} from './FilteredMedia';
import {TextLayersCanvas} from './TextLayersCanvas';
import {
  setExportCanvas,
  setExportRenderer,
} from '@/features/post/helpers/canvas/exportCanvasRegistry';
import {appStore} from '@/store/appStore';
import {defaultAdjustTransform} from '@/store/adjustSlice';
import {useElementSize} from '@/features/post/hooks/canvas/useElementSize';
import type {ExportMode} from '@/features/post/types/exportTypes';

type Props = {
  id: string;
  video: boolean;
  exportMode: ExportMode;
  mediaList?: MediaItem[];
  aspectType: 'square' | 'landscape' | 'vertical';
  getVideoRef?: (index: number) => React.RefObject<HTMLVideoElement | null>;
  handleTap?: (index: number) => void;
  mutedMap?: Record<number, boolean>;
  media?: MediaItem;
  index: number;
};

export const MediaCanvas = ({
  id,
  video,
  exportMode,
  mediaList,
  aspectType,
  getVideoRef,
  handleTap,
  mutedMap,
  media,
  index,
}: Props): React.JSX.Element => {
  const activeIndex = appStore(state => state.activeIndex);
  const adjustByIndex = appStore(state => state.adjustByIndex);
  const setCanvasSize = appStore(state => state.setCanvasSize);

  const {ref: containerRef, size: containerSize} =
    useElementSize<HTMLDivElement>();

  const adjustEntry = adjustByIndex[index];
  const bgColor =
    adjustEntry?.id === id
      ? adjustEntry.value.bgColor
      : defaultAdjustTransform.bgColor;

  const fileProps = useMemo(() => {
    if (media) {
      return {uri: media.uri, width: media.width, height: media.height};
    }
    if (mediaList?.[0]) {
      return {
        uri: mediaList[0].uri,
        width: mediaList[0].width,
        height: mediaList[0].height,
      };
    }
    return {uri: '', width: 1, height: 1};
  }, [media, mediaList]);

  useEffect(() => {
    if (index !== activeIndex) {
      return;
    }
    if (
      containerSize &&
      containerSize.width !== 0 &&
      containerSize.height !== 0
    ) {
      setCanvasSize(containerSize.width, containerSize.height);
    }
  }, [containerSize, setCanvasSize, activeIndex, index]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full origin-center overflow-hidden rounded-lg"
      style={{
        backgroundColor: bgColor,
      }}>
      <Canvas
        id={`canvas-${aspectType}-${index}`}
        style={{width: '100%', height: '100%', zIndex: 100}}
        camera={{position: [0, 0, 5], fov: 50}}
        gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
        onCreated={state => {
          setExportCanvas(index, state.gl.domElement);
          setExportRenderer(index, {invalidate: state.invalidate});
        }}>
        <FilteredMedia
          id={id}
          uri={fileProps.uri}
          isVideo={video}
          exportMode={exportMode}
          aspectType={aspectType}
          originalWidth={fileProps.width}
          originalHeight={fileProps.height}
          videoRef={getVideoRef ? getVideoRef(index) : undefined}
          handleTap={() => (handleTap ? handleTap(index) : undefined)}
          muted={mutedMap ? mutedMap[index] : false}
          index={index}
        />
        <TextLayersCanvas index={index} mediaId={id} />
      </Canvas>
    </div>
  );
};
