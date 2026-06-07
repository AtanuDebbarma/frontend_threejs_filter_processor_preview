import {appStore} from '@/store/appStore';
import {rnLogger} from '@/shared/utils/rnLogger';
import type {
  ExportMode,
  StartPostExportPayload,
} from '@/features/post/types/exportTypes';
import {
  flushPendingExportSuccesses,
  postPostExportAck,
} from '@/features/post/bridge/helpers/postExportRnMessages';
import {abortActivePostUpload} from '@/features/post/helpers/export/uploadExport';
import {runPostExportBatch} from '@/features/post/helpers/postExport/postExportMedia';

/** RN paused export (app background) — abort upload and stop batch. */
export const requestCancelPostExport = (): void => {
  appStore.getState().setPostExportCancelRequested(true);
  abortActivePostUpload();
};

export const handleStartOrResumePostExport = (
  payload: StartPostExportPayload,
  exportMode: ExportMode,
  source: 'START_POST_EXPORT' | 'RESUME_POST_EXPORT',
): void => {
  const {fileCount, items} = payload;
  rnLogger.log(`📥 ${source} received`, {fileCount, items});
  appStore.getState().setPostExportConfig(fileCount, items);
  appStore.getState().setIsPostExporting(true);
  appStore.getState().setPostExportCancelRequested(false);
  flushPendingExportSuccesses();
  postPostExportAck({fileCount});
  void runPostExportBatch(exportMode).catch(batchErr => {
    rnLogger.componentLog(
      'postBridge',
      'error',
      `${source} runPostExportBatch failed: ${batchErr}`,
      batchErr,
    );
  });
};

export const isStartPostExportPayload = (
  payload: unknown,
): payload is StartPostExportPayload => {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  const p = payload as StartPostExportPayload;
  return (
    p.mode === 'post' &&
    p.destination === 's3' &&
    typeof p.fileCount === 'number' &&
    Array.isArray(p.items) &&
    p.items.every(
      item =>
        typeof item.id === 'string' &&
        typeof item.index === 'number' &&
        (item.mediaType === 'photo' || item.mediaType === 'video'),
    )
  );
};
