import {faPlay, faPause} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useRef, useState, useEffect} from 'react';

export const VideoPlayer = React.memo(
  ({src, className}: {src: string; className?: string}): React.JSX.Element => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showButton, setShowButton] = useState(false);
    const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const togglePlay = () => {
      const video = videoRef.current;
      if (!video) return;

      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play();
        setIsPlaying(true);
      }
    };

    const handleTap = () => {
      togglePlay();

      // Show button
      setShowButton(true);

      // Clear previous timeout
      if (hideTimeout.current) clearTimeout(hideTimeout.current);

      // Auto-hide after 1 second
      hideTimeout.current = setTimeout(() => {
        setShowButton(false);
      }, 1000);
    };

    useEffect(() => {
      return () => {
        // Clean up timeout on unmount
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
      };
    }, []);

    return (
      <div className="relative h-full w-full">
        <video
          ref={videoRef}
          src={src}
          muted={false}
          controls={false}
          autoPlay={false}
          playsInline
          className={className}
          onClick={handleTap}
        />

        {(showButton || !isPlaying) && (
          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/40 p-4 text-white hover:bg-black/80">
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} size="lg" />
          </button>
        )}
      </div>
    );
  },
);
/**
 * @displayName VideoPlayer
 */
VideoPlayer.displayName = 'VideoPlayer';
