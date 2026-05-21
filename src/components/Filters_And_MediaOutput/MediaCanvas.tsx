import {Canvas} from '@react-three/fiber';
import React, {useEffect} from 'react';
import type {MediaItem} from '../../hooks/useVerifiedMediaFiles';
import {FilteredMedia} from './FilteredMedia';
import {
  setExportCanvas,
  setExportRenderer,
} from '../../helpers/exportCanvasRegistry';
import {appStore} from '../../store/appStore';
import {defaultAdjustTransform} from '../../store/adjustSlice';
import {useElementSize} from '../../hooks/useElementSize';

type Props = {
  id: string;
  video: boolean;
  post: boolean;
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
  post,
  mediaList,
  aspectType,
  getVideoRef,
  handleTap,
  mutedMap,
  media,
  index,
}: Props): React.JSX.Element => {
  const adjustByIndex = appStore(state => state.adjustByIndex);
  const setCanvasSize = appStore(state => state.setCanvasSize);

  const {ref: containerRef, size: containerSize} =
    useElementSize<HTMLDivElement>();

  const adjustEntry = adjustByIndex[index];
  const bgColor =
    adjustEntry?.id === id
      ? adjustEntry.value.bgColor
      : defaultAdjustTransform.bgColor;
  const files = () => {
    if (media) {
      return {uri: media.uri, width: media.width, height: media.height};
    } else if (mediaList) {
      return {
        uri: mediaList[0].uri,
        width: mediaList[0].width,
        height: mediaList[0].height,
      };
    } else {
      return {uri: '', width: 1, height: 1};
    }
  };

  useEffect(() => {
    if (
      containerSize &&
      containerSize.width !== 0 &&
      containerSize.height !== 0
    ) {
      setCanvasSize(containerSize.width, containerSize.height);
    }
  }, [containerSize, setCanvasSize]);

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
          uri={files().uri}
          isVideo={video}
          aspectType={aspectType}
          originalWidth={files().width}
          originalHeight={files().height}
          fit={post ? 'cover' : 'contain'}
          videoRef={getVideoRef ? getVideoRef(index) : undefined}
          handleTap={() => (handleTap ? handleTap(index) : undefined)}
          muted={mutedMap ? mutedMap[index] : false}
          index={index}
        />
      </Canvas>
    </div>
  );
};
