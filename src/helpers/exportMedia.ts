import {getExportCanvas} from './exportCanvasRegistry';
import {appStore} from '../store/appStore';
import {defaultAdjustTransform} from '../store/adjustSlice';
import {rnLogger} from '../utils/rnLogger';
import {blitCanvasToExportSize} from './exportBlit';
import {exportVideoMp4} from './exportVideoMp4';
import {
  resolveExportDimensions,
  type ExportMode,
  type SaveExportDataPayload,
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
): Promise<Blob> => {
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
    throw new Error('Video URI missing for export');
  }

  return exportVideoMp4({
    index,
    uri: media.uri,
    width: targetWidth,
    height: targetHeight,
    backgroundColor,
    muted,
  });
};

export type ExportActiveSlideResult = SaveExportDataPayload;

/**
 * Encodes the active carousel slide at export dimensions (see resolveExportDimensions).
 * Uses the live R3F canvas (filters + adjust already applied).
 */
export const exportActiveSlideForGallery = async (
  fileId: string,
  index: number,
  mode: ExportMode = 'post',
): Promise<ExportActiveSlideResult> => {
  const state = appStore.getState();
  const media = state.mediaFiles[index];
  if (!media || media.id !== fileId) {
    throw new Error(`No media at index ${index} for id ${fileId}`);
  }

  const sourceCanvas = getExportCanvas(index);
  if (!sourceCanvas || sourceCanvas.width < 2 || sourceCanvas.height < 2) {
    throw new Error(
      'Preview canvas not ready — wait for the editor to finish loading',
    );
  }

  const videoCount = state.mediaFiles.filter(
    f => f.mediaType === 'video',
  ).length;
  const {width, height} = resolveExportDimensions(
    mode,
    media.mediaType,
    videoCount,
  );
  const adjust = state.adjustByIndex[index]?.value ?? defaultAdjustTransform;
  const bgColor = adjust.bgColor ?? defaultAdjustTransform.bgColor;

  rnLogger.log(
    `📤 Export start id=${fileId} index=${index} ${width}x${height} type=${media.mediaType}`,
  );

  const blob = await captureExportBlob(
    sourceCanvas,
    width,
    height,
    bgColor,
    media.mediaType,
    index,
  );

  const exportBase64 = await blobToBase64(blob);
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
    id: fileId,
    exportBase64,
    mediaType: media.mediaType,
    filename,
    mimeType:
      blob.type || (media.mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
    width,
    height,
  };
};
