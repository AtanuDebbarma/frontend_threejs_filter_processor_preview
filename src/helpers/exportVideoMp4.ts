// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSource,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedPacketSink,
  Input,
  Mp4OutputFormat,
  Output,
  type AudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import {rnLogger} from '../utils/rnLogger';
import {
  assertSaveExport,
  assertSaveExportCondition,
  logSaveTechnical,
  logSaveWarn,
  SaveExportStage,
} from './saveExportDiagnostics';
import {getExportCanvas, getExportRenderer} from './exportCanvasRegistry';
import {VIDEO_EXPORT_FPS} from './exportTypes';
import {blitCanvasToExportSize} from './exportBlit';
import {mediaUriToBlob} from './mediaUriToBlob';
import {getExportVideo} from './exportVideoRegistry';

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

const loadAudioPackets = async (
  uri: string,
): Promise<{codec: AudioCodec; packets: EncodedPacket[]} | null> => {
  try {
    const blob = await mediaUriToBlob(uri);
    const input = new Input({
      source: new BlobSource(blob),
      formats: ALL_FORMATS,
    });
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!audioTrack) {
      return null;
    }
    const codec = await audioTrack.getCodec();
    if (!codec) {
      return null;
    }
    const packets: EncodedPacket[] = [];
    const sink = new EncodedPacketSink(audioTrack);
    for await (const packet of sink.packets()) {
      packets.push(packet);
    }
    return {codec: codec as AudioCodec, packets};
  } catch (err) {
    logSaveWarn(SaveExportStage.VIDEO_AUDIO_READ, err, {uri: uri.slice(0, 80)});
    return null;
  }
};

/**
 * Encodes filtered WebGL preview frames to MP4 (H.264 + source audio when readable).
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

  assertSaveExport(
    sourceCanvas,
    SaveExportStage.VALIDATE_CANVAS,
    'Preview canvas not ready — wait for the editor to finish loading',
  );
  assertSaveExportCondition(
    sourceCanvas.width >= 2 && sourceCanvas.height >= 2,
    SaveExportStage.VALIDATE_CANVAS,
    'Preview canvas not ready — wait for the editor to finish loading',
  );
  assertSaveExport(
    video,
    SaveExportStage.VIDEO_VALIDATE,
    'Video element not ready for export',
  );
  assertSaveExportCondition(
    Number.isFinite(video.duration) && video.duration > 0,
    SaveExportStage.VIDEO_VALIDATE,
    'Video element not ready for export',
  );

  const videoCodec = await getFirstEncodableVideoCodec(['avc'], {
    width,
    height,
    bitrate: 4_000_000,
  });
  assertSaveExport(
    videoCodec,
    SaveExportStage.VIDEO_CODEC,
    'H.264 video encoding is not supported on this device',
  );

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;

  const renderFilteredFrameAt = async (timeSec: number): Promise<void> => {
    const clamped = Math.min(
      Math.max(0, timeSec),
      Math.max(0, video.duration - 0.001),
    );
    video.pause();
    video.currentTime = clamped;
    await waitForVideoSeek(video);
    renderer?.invalidate();
    await waitAnimationFrames(2);
    blitCanvasToExportSize(
      sourceCanvas,
      width,
      height,
      backgroundColor,
      frameCanvas,
    );
  };

  const audioData = muted ? null : await loadAudioPackets(uri);

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({fastStart: false}),
    target,
  });

  const videoSource = new CanvasSource(frameCanvas, {
    codec: videoCodec,
    bitrate: 4_000_000,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, {frameRate: VIDEO_EXPORT_FPS});

  let audioSource: EncodedAudioPacketSource | null = null;
  if (audioData) {
    audioSource = new EncodedAudioPacketSource(audioData.codec);
    output.addAudioTrack(audioSource);
  }

  const wasPlaying = !video.paused;
  video.pause();

  const frameDuration = 1 / VIDEO_EXPORT_FPS;
  const totalFrames = Math.max(1, Math.ceil(video.duration * VIDEO_EXPORT_FPS));

  try {
    try {
      await output.start();

      for (let i = 0; i < totalFrames; i++) {
        const t = i * frameDuration;
        if (t >= video.duration) {
          break;
        }
        try {
          await renderFilteredFrameAt(t);
          await videoSource.add(t, frameDuration);
        } catch (frameErr) {
          logSaveTechnical(SaveExportStage.VIDEO_ENCODE_LOOP, frameErr, {
            index,
            frame: i + 1,
            totalFrames,
            t,
          });
          throw frameErr;
        }
        if (i % 15 === 0 || i === totalFrames - 1) {
          rnLogger.log(
            `📤 Video encode ${Math.round(((i + 1) / totalFrames) * 100)}% frame ${i + 1}/${totalFrames}`,
          );
        }
      }

      videoSource.close();

      if (audioSource && audioData) {
        for (const packet of audioData.packets) {
          await audioSource.add(packet);
        }
        audioSource.close();
      }

      await output.finalize();
    } catch (encodeErr) {
      logSaveTechnical(SaveExportStage.VIDEO_MUX_FINALIZE, encodeErr, {
        index,
        totalFrames,
      });
      throw encodeErr;
    }
  } finally {
    if (wasPlaying) {
      void video.play().catch(() => undefined);
    }
  }

  const buffer = target.buffer;
  assertSaveExport(
    buffer,
    SaveExportStage.VIDEO_EMPTY_OUTPUT,
    'Video export produced an empty file',
  );
  assertSaveExportCondition(
    buffer.byteLength > 0,
    SaveExportStage.VIDEO_EMPTY_OUTPUT,
    'Video export produced an empty file',
  );

  return new Blob([buffer], {type: 'video/mp4'});
};
