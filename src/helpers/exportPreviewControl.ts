import {fnLog} from '../utils/rnLogger';
import {forEachExportVideo} from './exportVideoRegistry';

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
