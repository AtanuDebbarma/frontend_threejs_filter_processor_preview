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

let pendingExportSuccesses: ExportSuccessPayload[] = [];
let lastFlushedSuccessIds: string[] = [];

/** Deliver EXPORT_SUCCESS payloads that failed to reach RN (e.g. app backgrounded). */
export const flushPendingExportSuccesses = (): void => {
  if (pendingExportSuccesses.length === 0) {
    lastFlushedSuccessIds = [];
    return;
  }
  const queue = [...pendingExportSuccesses];
  pendingExportSuccesses = [];
  lastFlushedSuccessIds = [];
  for (const payload of queue) {
    try {
      postToRN('EXPORT_SUCCESS', payload);
      lastFlushedSuccessIds.push(payload.id);
    } catch {
      pendingExportSuccesses.push(payload);
    }
  }
};

/** Ids delivered on the last flush — skip re-encode for those files on resume. */
export const consumeLastFlushedSuccessIds = (): string[] => {
  const ids = lastFlushedSuccessIds;
  lastFlushedSuccessIds = [];
  return ids;
};

export const postExportProgress = (payload: ExportProgressPayload): void => {
  try {
    postToRN('EXPORT_PROGRESS', payload);
  } catch {
    /* progress is best-effort */
  }
};

export const postExportSuccess = (payload: ExportSuccessPayload): void => {
  try {
    postToRN('EXPORT_SUCCESS', payload);
  } catch {
    pendingExportSuccesses.push(payload);
  }
};

export const postPostExportFailed = (
  payload: PostExportFailedPayload,
): void => {
  postToRN('POST_EXPORT_FAILED', payload);
};

export const postPostExportAck = (payload: PostExportAckPayload): void => {
  postToRN('POST_EXPORT_ACK', payload);
};

export const getPendingExportSuccessCountForTests = (): number =>
  pendingExportSuccesses.length;

export const resetPendingExportSuccessesForTests = (): void => {
  pendingExportSuccesses = [];
  lastFlushedSuccessIds = [];
};
