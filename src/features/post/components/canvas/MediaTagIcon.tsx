import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCircleUser} from '@fortawesome/free-solid-svg-icons';
import type {MediaItem} from '@/features/post/hooks/canvas/useVerifiedMediaFiles';

type Props = {
  mediaIndex: number;
  mediaList: MediaItem[];
  onTagPress: () => void;
};

/** Stable tag affordance on photo slides (not redefined inside MediaCanvasContainer). */
export const MediaTagIcon = ({
  mediaIndex,
  mediaList,
  onTagPress,
}: Props): React.JSX.Element | null => {
  const media = mediaList[mediaIndex];
  if (!media || media.mediaType === 'video') {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        window.setTimeout(() => onTagPress(), 200);
      }}
      className="absolute bottom-2 left-2 z-500 rounded-full bg-white/40 text-white shadow-sm transition-opacity duration-180 active:opacity-50">
      <FontAwesomeIcon icon={faCircleUser} size="lg" color="black" />
    </button>
  );
};
