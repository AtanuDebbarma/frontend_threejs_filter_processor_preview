import {appStore} from '../store/appStore';
import {rnLogger} from '../utils/rnLogger';
import type {
  ExportMode,
  ExportProgressPayload,
  ExportSuccessPayload,
  PostExportAckPayload,
  PostExportFailedPayload,
  StartPostExportPayload,
} from './exportTypes';
import {runPostExportBatch} from './postExportMedia';

const postToRN = (type: string, payload: unknown) => {
  if (!window.ReactNativeWebView) {
    throw new Error('ReactNativeWebView bridge not available');
  }
  window.ReactNativeWebView.postMessage(JSON.stringify({type, payload}));
};

export const postExportProgress = (payload: ExportProgressPayload): void => {
  try {
    postToRN('EXPORT_PROGRESS', payload);
  } catch {
    /* progress is best-effort */
  }
};

export const postExportSuccess = (payload: ExportSuccessPayload): void => {
  postToRN('EXPORT_SUCCESS', payload);
};

export const postPostExportFailed = (
  payload: PostExportFailedPayload,
): void => {
  postToRN('POST_EXPORT_FAILED', payload);
};

export const postPostExportAck = (payload: PostExportAckPayload): void => {
  postToRN('POST_EXPORT_ACK', payload);
};

/** RN paused export (app background) — stop batch between files. */
export const requestCancelPostExport = (): void => {
  appStore.getState().setPostExportCancelRequested(true);
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
