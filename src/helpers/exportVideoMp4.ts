import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import {rnLogger} from '../utils/rnLogger';
import {getExportCanvas, getExportRenderer} from './exportCanvasRegistry';
import {VIDEO_EXPORT_FPS} from './exportTypes';
import {blitCanvasToExportSize} from './exportBlit';
import {getExportVideo} from './exportVideoRegistry';

const uriToBlob = async (uri: string): Promise<Blob> => {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Failed to read video (${res.status})`);
  }
  return res.blob();
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

const waitForVideoSeek = (video: HTMLVideoElement): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('Video seek timed out')),
      20_000,
    );
    const finish = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(finish);
    } else {
      video.addEventListener('seeked', finish, {once: true});
    }
  });

export type ExportVideoMp4Params = {
  index: number;
  uri: string;
  width: number;
  height: number;
  backgroundColor: string;
  muted: boolean;
};

/**
 * Encodes filtered WebGL preview frames to MP4 (H.264 + source audio when not muted).
 * Uses Mediabunny Conversion with a per-frame process hook; output is buffered for RN base64 handoff.
 */
export const exportVideoMp4 = async ({
  index,
  uri,
  width,
  height,
  backgroundColor,
  muted,
}: ExportVideoMp4Params): Promise<Blob> => {
  const sourceCanvas = getExportCanvas(index);
  const video = getExportVideo(index);
  const renderer = getExportRenderer(index);

  if (!sourceCanvas || sourceCanvas.width < 2 || sourceCanvas.height < 2) {
    throw new Error(
      'Preview canvas not ready — wait for the editor to finish loading',
    );
  }
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error('Video element not ready for export');
  }

  const videoCodec = await getFirstEncodableVideoCodec(['avc'], {
    width,
    height,
    bitrate: 4_000_000,
  });
  if (!videoCodec) {
    throw new Error('H.264 video encoding is not supported on this device');
  }

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;

  const renderFilteredFrameAt = async (
    timeSec: number,
  ): Promise<HTMLCanvasElement> => {
    const clamped = Math.min(
      Math.max(0, timeSec),
      Math.max(0, video.duration - 0.001),
    );
    video.pause();
    video.currentTime = clamped;
    await waitForVideoSeek(video);
    renderer?.invalidate();
    await waitAnimationFrames(2);
    return blitCanvasToExportSize(
      sourceCanvas,
      width,
      height,
      backgroundColor,
      frameCanvas,
    );
  };

  const inputBlob = await uriToBlob(uri);
  const input = new Input({
    source: new BlobSource(inputBlob),
    formats: ALL_FORMATS,
  });
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({fastStart: false}),
    target,
  });

  const wasPlaying = !video.paused;
  video.pause();

  try {
    const conversion = await Conversion.init({
      input,
      output,
      video: {
        width,
        height,
        codec: videoCodec,
        bitrate: 4_000_000,
        frameRate: VIDEO_EXPORT_FPS,
        forceTranscode: true,
        allowRotationMetadata: false,
        processedWidth: width,
        processedHeight: height,
        process: sample => renderFilteredFrameAt(sample.timestamp),
      },
      audio: muted ? {discard: true} : undefined,
    });

    if (!conversion.isValid) {
      const reason = conversion.discardedTracks[0]?.reason ?? 'unknown';
      throw new Error(`Video export configuration invalid: ${reason}`);
    }

    conversion.onProgress = (progress, processedTime) => {
      rnLogger.log(
        `📤 Video encode ${Math.round(progress * 100)}% @ ${processedTime.toFixed(1)}s`,
      );
    };

    await conversion.execute();
  } finally {
    if (wasPlaying) {
      void video.play().catch(() => undefined);
    }
  }

  const buffer = target.buffer;
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Video export produced an empty file');
  }

  return new Blob([buffer], {type: 'video/mp4'});
};
