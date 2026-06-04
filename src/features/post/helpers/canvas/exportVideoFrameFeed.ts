import type {VideoSample} from 'mediabunny';
import {getExportFrameDriver} from './exportFrameDriver';
import {fnLog} from '@/shared/utils/rnLogger';

type PipelineReadyState = {
  ready: boolean;
  waiters: Array<() => void>;
};

const pipelineReadyByIndex = new Map<number, PipelineReadyState>();

const getPipelineReady = (index: number): PipelineReadyState => {
  let state = pipelineReadyByIndex.get(index);
  if (!state) {
    state = {ready: false, waiters: []};
    pipelineReadyByIndex.set(index, state);
  }
  return state;
};

/** FilteredMedia calls when export VideoFrameTexture + gl.render driver are registered. */
export const signalExportPipelineReady = (index: number): void => {
  const state = getPipelineReady(index);
  state.ready = true;
  for (const resolve of state.waiters) {
    resolve();
  }
  state.waiters = [];
};

export const resetExportPipelineReady = (index: number): void => {
  pipelineReadyByIndex.delete(index);
};

export const waitForExportPipelineReady = (
  index: number,
  timeoutMs = 15_000,
): Promise<void> => {
  const state = getPipelineReady(index);
  if (state.ready) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onReady = () => {
      window.clearTimeout(timer);
      resolve();
    };
    state.waiters.push(onReady);
    const timer = window.setTimeout(() => {
      const idx = state.waiters.indexOf(onReady);
      if (idx >= 0) {
        state.waiters.splice(idx, 1);
      }
      reject(
        new Error(
          'Export pipeline not ready — VideoFrameTexture did not initialize',
        ),
      );
    }, timeoutMs);
  });
};

export const clearExportFrameFeed = (index: number): void => {
  resetExportPipelineReady(index);
};

/**
 * Decode one sample, paint through the WebGL filter shader, and render synchronously.
 * Does not use R3F useFrame / rAF (throttled when RN Save modal covers the WebView).
 */
export const feedDecodedFrameToFilteredCanvas = async (
  index: number,
  sample: VideoSample,
): Promise<void> => {
  await waitForExportPipelineReady(index);

  const driver = getExportFrameDriver(index);
  if (!driver) {
    throw new Error('Export frame driver missing after pipeline ready');
  }

  let videoFrame: VideoFrame;
  try {
    videoFrame = sample.toVideoFrame();
  } finally {
    sample.close();
  }

  try {
    driver.paintAndRender(videoFrame);
  } catch (err) {
    fnLog('feedDecodedFrameToFilteredCanvas', 'error', String(err));
    throw err;
  }
};
