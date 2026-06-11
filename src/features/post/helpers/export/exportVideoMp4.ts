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
  VideoSampleSink,
  type AudioCodec,
  type Target,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import {rnLogger} from '@/shared/utils/rnLogger';
import {
  assertSaveExport,
  assertSaveExportCondition,
  logSaveTechnical,
  logSaveWarn,
  SaveExportStage,
  throwSaveExportError,
} from '@/features/post/bridge/helpers/saveExportDiagnostics';
import {getExportCanvas} from '@/features/post/helpers/canvas/exportCanvasRegistry';
import {
  DEFAULT_SAVE_CHUNK_BYTES,
  VIDEO_EXPORT_BITRATE,
  VIDEO_EXPORT_FPS,
} from '@/features/post/types/exportTypes';
import {blitCanvasToExportSize} from './exportBlit';
import {mediaUriToBlob} from './mediaUriToBlob';
import {
  clearExportFrameFeed,
  feedDecodedFrameToFilteredCanvas,
  waitForExportPipelineReady,
} from '@/features/post/helpers/canvas/exportVideoFrameFeed';
import {createAppendOnlyMuxTarget} from './exportMuxStreamTarget';
import {createExportProgressReporter} from './exportProgress';
import {postSaveExportChunk} from '@/features/post/bridge/helpers/saveBridge';

export type ExportVideoStreamHandoff = {
  id: string;
  index: number;
  chunkSizeBytes?: number;
};

export type ExportVideoMp4Params = {
  index: number;
  uri: string;
  width: number;
  height: number;
  backgroundColor: string;
  muted: boolean;
  fileId: string;
  /** Phase E: stream mux bytes to RN instead of one Blob. */
  streamHandoff?: ExportVideoStreamHandoff;
};

const uint8ToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
};

type LoadedAudioForMux = {
  codec: AudioCodec;
  packets: EncodedPacket[];
  decoderConfig: AudioDecoderConfig;
};

/**
 * MP4 mux requires non-negative PTS. Source files (especially AAC) may include
 * priming packets with slightly negative timestamps while video export starts at 0.
 */
export const normalizeAudioPacketsForMux = (
  packets: EncodedPacket[],
): EncodedPacket[] => {
  if (packets.length === 0) {
    return packets;
  }

  const minTimestamp = Math.min(...packets.map(packet => packet.timestamp));
  if (minTimestamp >= 0) {
    return packets;
  }

  return packets
    .map(packet => packet.clone({timestamp: packet.timestamp - minTimestamp}))
    .filter(packet => packet.timestamp + packet.duration > 0);
};

const loadAudioPackets = async (
  uri: string,
): Promise<LoadedAudioForMux | null> => {
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
    const decoderConfig = await audioTrack.getDecoderConfig();
    if (!decoderConfig) {
      logSaveWarn(SaveExportStage.VIDEO_AUDIO_READ, 'No audio decoder config', {
        uri: uri.slice(0, 80),
      });
      return null;
    }
    const packets: EncodedPacket[] = [];
    const sink = new EncodedPacketSink(audioTrack);
    for await (const packet of sink.packets()) {
      packets.push(packet);
    }
    if (packets.length === 0) {
      return null;
    }
    return {codec: codec as AudioCodec, packets, decoderConfig};
  } catch (err) {
    logSaveWarn(SaveExportStage.VIDEO_AUDIO_READ, err, {uri: uri.slice(0, 80)});
    return null;
  }
};

const resolveVideoDuration = async (input: Input): Promise<number> => {
  const fromMeta = await input.getDurationFromMetadata();
  if (typeof fromMeta === 'number' && fromMeta > 0) {
    return fromMeta;
  }
  const computed = await input.computeDuration();
  assertSaveExportCondition(
    Number.isFinite(computed) && computed > 0,
    SaveExportStage.VIDEO_VALIDATE,
    'Could not determine video duration for export',
  );
  return computed;
};

/**
 * Encodes filtered WebGL frames to MP4 via sequential Mediabunny decode (no preview-video seek).
 */
export const exportVideoMp4 = async ({
  index,
  uri,
  width,
  height,
  backgroundColor,
  muted,
  fileId,
  streamHandoff,
}: ExportVideoMp4Params): Promise<Blob | void> => {
  const sourceCanvas = getExportCanvas(index);

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

  const videoCodec = await getFirstEncodableVideoCodec(['avc'], {
    width,
    height,
    bitrate: VIDEO_EXPORT_BITRATE,
  });
  assertSaveExport(
    videoCodec,
    SaveExportStage.VIDEO_CODEC,
    'H.264 video encoding is not supported on this device',
  );

  const blob = await mediaUriToBlob(uri);
  const input = new Input({
    source: new BlobSource(blob),
    formats: ALL_FORMATS,
  });
  const videoTrack = await input.getPrimaryVideoTrack();
  assertSaveExport(
    videoTrack,
    SaveExportStage.VIDEO_VALIDATE,
    'No video track found in source file',
  );

  if (!(await videoTrack.canDecode())) {
    throwSaveExportError(
      SaveExportStage.VIDEO_CODEC,
      'Video track cannot be decoded in this WebView',
    );
  }

  const duration = await resolveVideoDuration(input);
  const frameDuration = 1 / VIDEO_EXPORT_FPS;
  const totalFrames = Math.max(1, Math.ceil(duration * VIDEO_EXPORT_FPS));

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;

  const audioData = muted ? null : await loadAudioPackets(uri);

  const progress = createExportProgressReporter(fileId);
  progress(0, 'encoding', true);

  let muxSeq = 0;
  const chunkSize = streamHandoff?.chunkSizeBytes ?? DEFAULT_SAVE_CHUNK_BYTES;

  let target: Target;
  if (streamHandoff) {
    target = createAppendOnlyMuxTarget(async (data, done) => {
      if (data.length > 0) {
        postSaveExportChunk({
          id: streamHandoff.id,
          index: streamHandoff.index,
          seq: muxSeq,
          dataBase64: uint8ToBase64(data),
          done: false,
        });
        muxSeq += 1;
      }
      if (done) {
        postSaveExportChunk({
          id: streamHandoff.id,
          index: streamHandoff.index,
          seq: muxSeq,
          dataBase64: '',
          done: true,
        });
        muxSeq += 1;
        progress(100, 'writing', true);
      }
    }, chunkSize);
  } else {
    target = new BufferTarget();
  }

  const output = new Output({
    format: new Mp4OutputFormat({
      // Post S3 uploads use BufferTarget — moov at front for progressive playback.
      fastStart: streamHandoff ? 'fragmented' : 'in-memory',
    }),
    target,
  });

  const videoSource = new CanvasSource(frameCanvas, {
    codec: videoCodec,
    bitrate: VIDEO_EXPORT_BITRATE,
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, {frameRate: VIDEO_EXPORT_FPS});

  let audioSource: EncodedAudioPacketSource | null = null;
  if (audioData) {
    audioSource = new EncodedAudioPacketSource(audioData.codec);
    output.addAudioTrack(audioSource);
  }

  const encodeStart = performance.now();
  let encodedFrames = 0;
  let nextOutputTime = 0;

  try {
    await output.start();

    await waitForExportPipelineReady(index);

    const sink = new VideoSampleSink(videoTrack);

    for await (const sample of sink.samples(0, duration)) {
      if (nextOutputTime >= duration) {
        sample.close();
        break;
      }

      if (sample.timestamp + sample.duration < nextOutputTime) {
        sample.close();
        continue;
      }

      const t = nextOutputTime;

      try {
        await feedDecodedFrameToFilteredCanvas(index, sample);
        blitCanvasToExportSize(
          sourceCanvas,
          width,
          height,
          backgroundColor,
          frameCanvas,
        );
        await videoSource.add(t, frameDuration);
        encodedFrames += 1;
        nextOutputTime += frameDuration;

        if (
          encodedFrames % 15 === 0 ||
          nextOutputTime >= duration - frameDuration
        ) {
          const pct = Math.round((encodedFrames / totalFrames) * 100);
          progress(pct, 'encoding');
          rnLogger.log(
            `📤 Video encode (sequential) ${pct}% frame ${encodedFrames}/${totalFrames}`,
          );
        }
      } catch (frameErr) {
        logSaveTechnical(SaveExportStage.VIDEO_ENCODE_LOOP, frameErr, {
          index,
          frame: encodedFrames + 1,
          totalFrames,
          t,
        });
        throw frameErr;
      }
    }

    videoSource.close();

    if (audioSource && audioData) {
      const audioMeta: EncodedAudioChunkMetadata = {
        decoderConfig: audioData.decoderConfig,
      };
      const muxPackets = normalizeAudioPacketsForMux(audioData.packets);
      for (const packet of muxPackets) {
        await audioSource.add(packet, audioMeta);
      }
      audioSource.close();
    }

    await output.finalize();
    progress(100, 'encoding', true);

    rnLogger.log(
      `📤 Video encode done: ${encodedFrames} frames in ${Math.round(performance.now() - encodeStart)}ms`,
    );
  } catch (encodeErr) {
    logSaveTechnical(SaveExportStage.VIDEO_MUX_FINALIZE, encodeErr, {
      index,
      totalFrames,
      encodedFrames,
    });
    throw encodeErr;
  } finally {
    clearExportFrameFeed(index);
  }

  if (streamHandoff) {
    return;
  }

  const buffer = (target as BufferTarget).buffer;
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
