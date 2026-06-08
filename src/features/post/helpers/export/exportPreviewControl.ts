import {TEXT_FLOW_BUTTONS} from '@/features/post/constants/textFlowButtons';
import {forEachExportVideo} from '@/features/post/helpers/canvas/exportVideoRegistry';
import type {ButtonStateType} from '@/store/buttonSlices';
import {fnLog} from '@/shared/utils/rnLogger';

/** True when adjust overlay, tag mode, or any text-editing menu should freeze preview video. */
export const shouldPausePreviewVideosForOverlay = (
  activeButton: ButtonStateType,
  tagMode: boolean,
): boolean =>
  activeButton === 'adjust' ||
  tagMode ||
  (activeButton !== null && TEXT_FLOW_BUTTONS.has(activeButton));

/**
 * Phase A: stop all preview videos when Save starts so export does not fight playback.
 * Videos stay paused after Save (user taps play to resume).
 */
export const pauseAllPreviewVideos = (): void => {
  forEachExportVideo((video, index) => {
    try {
      video.pause();
    } catch (err) {
      fnLog(
        'pauseAllPreviewVideos',
        'warn',
        `Failed to pause video at index ${index}: ${err}`,
      );
    }
  });
};
