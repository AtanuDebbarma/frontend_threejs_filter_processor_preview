/**
 * Post export — batch encode (Phase 1+) then per-file S3 upload (Phase 2+).
 *
 * **F2 (active slide / editor uniforms):** Before each capture we call
 * `setActiveIndex(item.index)` and wait for the export renderer to settle
 * (`invalidate()` + double `requestAnimationFrame`). `FilteredMedia` reads
 * `editorByIndex[activeIndex]`; aligning store `activeIndex` with the slide
 * under export avoids wrong filter/adjust on non-active slides. If this proves
 * flaky on device, refactor `FilteredMedia` to use `editorByIndex[props.index]`.
 *
 * **Order (v1):** encode(i) → upload(i) → EXPORT_SUCCESS(i) → release Blob → next.
 */

import {appStore} from '../store/appStore';
import {defaultAdjustTransform} from '../store/adjustSlice';
import type {MediaFile} from '../types/filterTypes';
import {rnLogger} from '../utils/rnLogger';
import {captureExportBlob} from './exportMedia';
import {getExportCanvas, getExportRenderer} from './exportCanvasRegistry';
import {pauseAllPreviewVideos} from './exportPreviewControl';
import {
  postExportProgress,
  postExportSuccess,
  postPostExportFailed,
} from './postBridge';
import {resolveExportDimensions, type ExportMode} from './exportTypes';
import {uploadEncodedMediaToEndpoint} from './uploadExport';

const waitForAnimationFrame = (): Promise<void> =>
  new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });

/** Let R3F / uniforms catch up after `setActiveIndex`. */
const settleSlideForExport = async (index: number): Promise<void> => {
  getExportRenderer(index)?.invalidate();
  await waitForAnimationFrame();
  await waitForAnimationFrame();
};

const buildExportFilename = (media: MediaFile, fileId: string): string => {
  const baseName =
    media.filename?.replace(/\.[^.]+$/, '') || `mobeet_${fileId}`;
  return media.mediaType === 'photo'
    ? `${baseName}_export.jpg`
    : `${baseName}_export.mp4`;
};

const resolveMimeType = (blob: Blob, mediaType: 'photo' | 'video'): string => {
  if (blob.type) {
    return blob.type;
  }
  return mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
};

/**
 * Encode one slide to a Blob (Post path — no base64 / RN chunk handoff).
 */
export const exportSlideToBlob = async (
  index: number,
  fileId: string,
  mode: ExportMode = 'post',
): Promise<Blob> => {
  const state = appStore.getState();
  const media = state.mediaFiles[index];
  if (!media) {
    throw new Error(`No media at index ${index} for id ${fileId}`);
  }
  if (media.id !== fileId) {
    throw new Error(`Media id mismatch at index ${index}: expected ${fileId}`);
  }

  const sourceCanvas = getExportCanvas(index);
  if (!sourceCanvas) {
    throw new Error(
      'Preview canvas not ready — wait for the editor to finish loading',
    );
  }
  if (sourceCanvas.width < 2 || sourceCanvas.height < 2) {
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
    `📤 Post encode start id=${fileId} index=${index} ${width}x${height} type=${media.mediaType}`,
  );

  const blobOrVoid = await captureExportBlob(
    sourceCanvas,
    width,
    height,
    bgColor,
    media.mediaType,
    index,
    fileId,
  );

  if (!(blobOrVoid instanceof Blob)) {
    throw new Error('Post export did not produce a Blob');
  }

  rnLogger.log(
    `📤 Post encode done id=${fileId} bytes=${blobOrVoid.size} type=${blobOrVoid.type}`,
  );

  return blobOrVoid;
};

/**
 * Encode → upload → EXPORT_SUCCESS per file (one Blob in memory at a time).
 */
export const runPostExportBatch = async (): Promise<void> => {
  const state = appStore.getState();
  const {postExportItems, postExportFileCount, postUploadEndpointUrl} = state;
  const fileCount = postExportFileCount || postExportItems.length;

  if (!postExportItems.length) {
    rnLogger.warn('runPostExportBatch: no postExportItems');
    state.setIsPostExporting(false);
    return;
  }

  if (!postUploadEndpointUrl) {
    postPostExportFailed({
      error: 'Upload endpoint not configured',
      technicalError: 'postUploadEndpointUrl is null (hydration missing?)',
    });
    state.setIsPostExporting(false);
    state.resetPostExport();
    return;
  }

  pauseAllPreviewVideos();

  try {
    for (let fileIndex = 0; fileIndex < postExportItems.length; fileIndex++) {
      const item = postExportItems[fileIndex];
      const {id, index, mediaType} = item;

      appStore.getState().setActiveIndex(index);
      await settleSlideForExport(index);

      postExportProgress({
        id,
        percent: 0,
        stage: 'encoding',
        fileIndex,
        fileCount,
      });

      let blob: Blob | null = null;
      try {
        blob = await exportSlideToBlob(index, id, 'post');

        postExportProgress({
          id,
          percent: 100,
          stage: 'encoding',
          fileIndex,
          fileCount,
        });

        const media = appStore.getState().mediaFiles[index];
        if (!media) {
          throw new Error(`Media missing at index ${index}`);
        }

        const filename = buildExportFilename(media, id);
        const mimeType = resolveMimeType(blob, mediaType);

        rnLogger.log(
          `📤 Post upload start id=${id} filename=${filename} bytes=${blob.size}`,
        );

        const s3Url = await uploadEncodedMediaToEndpoint({
          endpointUrl: postUploadEndpointUrl,
          blob,
          filename,
          mimeType,
          onProgress: uploadPct => {
            postExportProgress({
              id,
              percent: Math.min(100, Math.max(0, uploadPct)),
              stage: 'uploading',
              fileIndex,
              fileCount,
            });
          },
        });

        rnLogger.log(`✅ Post upload done id=${id} url=${s3Url}`);

        postExportSuccess({
          id,
          index,
          s3Url,
          mediaType,
          fileIndex,
          fileCount,
        });
      } catch (fileErr) {
        const message =
          fileErr instanceof Error ? fileErr.message : 'Post export failed';
        const technical =
          fileErr instanceof Error
            ? `${fileErr.name}: ${fileErr.message}`
            : String(fileErr);
        postPostExportFailed({
          id,
          error: message,
          technicalError: technical,
          mediaType,
          fileIndex,
          fileCount,
        });
        throw fileErr;
      } finally {
        blob = null;
      }
    }

    rnLogger.log('✅ Post batch encode + upload complete');
  } catch (err) {
    const technical =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    rnLogger.componentLog(
      'postExportMedia',
      'error',
      `Post batch failed: ${technical}`,
      err,
    );
    throw err;
  } finally {
    appStore.getState().setIsPostExporting(false);
    appStore.getState().resetPostExport();
  }
};
