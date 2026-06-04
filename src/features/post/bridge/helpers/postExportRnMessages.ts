import type {
  ExportProgressPayload,
  ExportSuccessPayload,
  PostExportAckPayload,
  PostExportFailedPayload,
} from '@/features/post/types/exportTypes';

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
