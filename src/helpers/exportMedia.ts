import {getExportCanvas} from './exportCanvasRegistry';
import {appStore} from '../store/appStore';
import {defaultAdjustTransform} from '../store/adjustSlice';
import {rnLogger} from '../utils/rnLogger';
import {blitCanvasToExportSize} from './exportBlit';
import {exportVideoMp4} from './exportVideoMp4';
import {createExportProgressReporter} from './exportProgress';
import {
  assertSaveExport,
  assertSaveExportCondition,
  logSaveTechnical,
  SaveExportStage,
  throwSaveExportError,
} from './saveExportDiagnostics';
import {sendSaveChunks} from './saveBridge';
import {
  DEFAULT_SAVE_CHUNK_BYTES,
  resolveExportDimensionsForMode,
  type ExportMode,
  SAVE_PHOTO_MAX_BLOB_BYTES,
  type SaveExportDataPayload,
  type StartSaveExportPayload,
} from './exportTypes';

export {blitCanvasToExportSize} from './exportBlit';

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Failed to read export blob'));
        return;
      }
      const comma = dataUrl.indexOf(',');
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });

export const captureExportBlob = async (
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  backgroundColor: string,
  mediaType: 'photo' | 'video',
  index: number,
  fileId: string,
  saveOptions?: Pick<StartSaveExportPayload, 'writePath' | 'chunkSizeBytes'>,
): Promise<Blob | void> => {
  const framed = blitCanvasToExportSize(
    sourceCanvas,
    targetWidth,
    targetHeight,
    backgroundColor,
  );

  if (mediaType === 'photo') {
    return new Promise((resolve, reject) => {
      framed.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('toBlob returned null'));
          }
        },
        'image/jpeg',
        0.92,
      );
    });
  }

  const state = appStore.getState();
  const muted = state.videoMutedState[index]?.muted ?? false;
  const media = state.mediaFiles[index];
  if (!media?.uri) {
    throwSaveExportError(
      SaveExportStage.VIDEO_URI,
      'Video URI missing for export',
    );
  }

  if (saveOptions?.writePath) {
    return exportVideoMp4({
      index,
      uri: media.uri,
      width: targetWidth,
      height: targetHeight,
      backgroundColor,
      muted,
      fileId,
      streamHandoff: {
        id: fileId,
        index,
        chunkSizeBytes: saveOptions.chunkSizeBytes ?? DEFAULT_SAVE_CHUNK_BYTES,
      },
    });
  }

  return exportVideoMp4({
    index,
    uri: media.uri,
    width: targetWidth,
    height: targetHeight,
    backgroundColor,
    muted,
    fileId,
  });
};

export type ExportGalleryResult =
  | {kind: 'base64'; payload: SaveExportDataPayload}
  | {kind: 'chunked'; id: string; index: number};

/**
 * Encodes the active carousel slide at export dimensions (see resolveExportDimensions).
 * Uses the live R3F canvas (filters + adjust already applied).
 */
export const exportActiveSlideForGallery = async (
  fileId: string,
  index: number,
  exportMode: ExportMode,
  saveOptions?: Pick<StartSaveExportPayload, 'writePath' | 'chunkSizeBytes'>,
): Promise<ExportGalleryResult> => {
  const state = appStore.getState();
  const media = state.mediaFiles[index];
  assertSaveExport(
    media,
    SaveExportStage.VALIDATE_MEDIA,
    `No media at index ${index} for id ${fileId}`,
  );
  assertSaveExportCondition(
    media.id === fileId,
    SaveExportStage.VALIDATE_MEDIA,
    `No media at index ${index} for id ${fileId}`,
  );

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

  const videoCount = state.mediaFiles.filter(
    f => f.mediaType === 'video',
  ).length;
  const {width, height} = resolveExportDimensionsForMode(
    exportMode,
    media.mediaType,
    videoCount,
  );
  const adjust = state.adjustByIndex[index]?.value ?? defaultAdjustTransform;
  const bgColor = adjust.bgColor ?? defaultAdjustTransform.bgColor;

  rnLogger.log(
    `📤 Export start id=${fileId} index=${index} ${width}x${height} type=${media.mediaType}`,
  );

  const progress = createExportProgressReporter(fileId);

  try {
    const blobOrVoid = await captureExportBlob(
      sourceCanvas,
      width,
      height,
      bgColor,
      media.mediaType,
      index,
      fileId,
      saveOptions,
    );

    if (media.mediaType === 'video' && saveOptions?.writePath) {
      progress(100, 'encoding', true);
      return {kind: 'chunked', id: fileId, index};
    }

    const blob = blobOrVoid as Blob;
    if (media.mediaType === 'photo' && blob.size > SAVE_PHOTO_MAX_BLOB_BYTES) {
      throwSaveExportError(
        SaveExportStage.BASE64_ENCODE,
        'Photo export is too large for bridge handoff',
      );
    }

    if (media.mediaType === 'video' && !saveOptions?.writePath) {
      const writeProgress = createExportProgressReporter(fileId);
      writeProgress(0, 'writing', true);
      await sendSaveChunks(blob, {
        id: fileId,
        index,
        chunkSizeBytes: saveOptions?.chunkSizeBytes,
        onProgress: pct => writeProgress(pct, 'writing'),
      });
      writeProgress(100, 'writing', true);
      return {kind: 'chunked', id: fileId, index};
    }

    let exportBase64: string;
    try {
      exportBase64 = await blobToBase64(blob);
    } catch (err) {
      logSaveTechnical(SaveExportStage.BASE64_ENCODE, err, {
        fileId,
        bytes: blob.size,
      });
      throw err;
    }

    const baseName =
      media.filename?.replace(/\.[^.]+$/, '') || `mobeet_${fileId}`;
    const filename =
      media.mediaType === 'photo'
        ? `${baseName}_export.jpg`
        : `${baseName}_export.mp4`;

    rnLogger.log(
      `📤 Export done id=${fileId} bytes≈${Math.round((exportBase64.length * 3) / 4)}`,
    );

    return {
      kind: 'base64',
      payload: {
        id: fileId,
        exportBase64,
        mediaType: media.mediaType,
        filename,
        mimeType:
          blob.type ||
          (media.mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        width,
        height,
      },
    };
  } catch (err) {
    const stage =
      media.mediaType === 'photo'
        ? SaveExportStage.PHOTO_TO_BLOB
        : SaveExportStage.VIDEO_ENCODE_LOOP;
    logSaveTechnical(stage, err, {fileId, index});
    throw err;
  }
};
