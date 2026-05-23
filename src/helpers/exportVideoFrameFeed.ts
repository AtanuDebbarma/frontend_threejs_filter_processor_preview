import type {VideoSample} from 'mediabunny';
import type {ExportRenderer} from './exportCanvasRegistry';

export type PendingExportFrame = {
  generation: number;
  frame: VideoFrame;
};

type FrameSlot = {
  generation: number;
  frame: VideoFrame | null;
  renderResolve: (() => void) | null;
};

const slots = new Map<number, FrameSlot>();

const getSlot = (index: number): FrameSlot => {
  let slot = slots.get(index);
  if (!slot) {
    slot = {generation: 0, frame: null, renderResolve: null};
    slots.set(index, slot);
  }
  return slot;
};

/** FilteredMedia useFrame: take the frame waiting to be painted for this slide. */
export const takePendingExportFrame = (
  index: number,
): PendingExportFrame | null => {
  const slot = slots.get(index);
  if (!slot?.frame) {
    return null;
  }
  const pending: PendingExportFrame = {
    generation: slot.generation,
    frame: slot.frame,
  };
  slot.frame = null;
  return pending;
};

export const markExportFrameRendered = (
  index: number,
  generation: number,
): void => {
  const slot = slots.get(index);
  if (!slot || slot.generation !== generation) {
    return;
  }
  slot.renderResolve?.();
  slot.renderResolve = null;
};

export const clearExportFrameFeed = (index: number): void => {
  const slot = slots.get(index);
  if (slot?.frame) {
    try {
      slot.frame.close();
    } catch {
      /* ignore */
    }
  }
  slots.delete(index);
};

const waitAnimationFrames = (count = 2): Promise<void> =>
  new Promise(resolve => {
    let remaining = count;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });

const waitForExportFrameRendered = (
  index: number,
  generation: number,
  timeoutMs = 8_000,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const slot = getSlot(index);
    if (slot.generation !== generation) {
      resolve();
      return;
    }
    const onRendered = () => {
      window.clearTimeout(timer);
      resolve();
    };
    slot.renderResolve = onRendered;
    const timer = window.setTimeout(() => {
      if (slot.renderResolve === onRendered) {
        slot.renderResolve = null;
        reject(new Error('Export frame render timed out'));
      }
    }, timeoutMs);
  });

/**
 * Push one decoded frame into the WebGL filter path (VideoFrameTexture), then wait for R3F to render.
 */
export const feedDecodedFrameToFilteredCanvas = async (
  index: number,
  sample: VideoSample,
  renderer: ExportRenderer | null,
): Promise<void> => {
  const slot = getSlot(index);
  slot.generation += 1;
  const generation = slot.generation;

  if (slot.frame) {
    try {
      slot.frame.close();
    } catch {
      /* ignore */
    }
    slot.frame = null;
  }

  let videoFrame: VideoFrame;
  try {
    videoFrame = sample.toVideoFrame();
  } finally {
    sample.close();
  }

  slot.frame = videoFrame;

  renderer?.invalidate();
  await waitAnimationFrames(1);
  await waitForExportFrameRendered(index, generation);
};
