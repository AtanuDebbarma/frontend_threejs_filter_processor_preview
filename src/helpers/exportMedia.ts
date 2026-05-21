import {getExportCanvas} from './exportCanvasRegistry';
import {appStore} from '../store/appStore';
import {defaultAdjustTransform} from '../store/adjustSlice';
import {rnLogger} from '../utils/rnLogger';
import {
  TARGET_DIMENSIONS,
  type ExportMode,
  type SaveExportDataPayload,
} from './exportTypes';

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

/** Cover-fit WebGL canvas into fixed 4:5 export framebuffer (preview parity). */
export const blitCanvasToExportSize = (
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  backgroundColor: string,
): HTMLCanvasElement => {
  const out = document.createElement('canvas');
  out.width = targetWidth;
  out.height = targetHeight;
  const ctx = out.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas unavailable for export');
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const sw = Math.max(1, source.width);
  const sh = Math.max(1, source.height);
  const scale = Math.max(targetWidth / sw, targetHeight / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const ox = (targetWidth - dw) / 2;
  const oy = (targetHeight - dh) / 2;

  ctx.drawImage(source, ox, oy, dw, dh);
  return out;
};

export const captureExportBlob = async (
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  backgroundColor: string,
  mediaType: 'photo' | 'video',
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

  throw new Error(
    'Video save export is not implemented yet — test Save with a photo first.',
  );
};

export type ExportActiveSlideResult = SaveExportDataPayload;

/**
 * Encodes the active carousel slide at post dimensions (864×1080).
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

  const {width, height} = TARGET_DIMENSIONS[mode];
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
    mimeType: blob.type || 'image/jpeg',
  };
};
