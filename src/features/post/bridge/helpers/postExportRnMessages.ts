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

/** Upload finished on web — retained until RN acks (survives silent bridge drops). */
const handoffRegistry = new Map<string, ExportSuccessPayload>();
const rnAckedIds = new Set<string>();

const deliverExportSuccess = (payload: ExportSuccessPayload): boolean => {
  try {
    postToRN('EXPORT_SUCCESS', payload);
    return true;
  } catch {
    return false;
  }
};

/** Clear registry when a fresh post export session starts (not on resume). */
export const clearExportSuccessHandoff = (): void => {
  handoffRegistry.clear();
  rnAckedIds.clear();
};

export const ackExportSuccessFromRn = (id: string): void => {
  if (!id) {
    return;
  }
  rnAckedIds.add(id);
};

/**
 * RN reports which attachment ids already have EXPORT_SUCCESS applied.
 * Marks those acked and re-sends any completed uploads RN is missing.
 */
export const syncExportSuccessHandoff = (receivedIds: string[]): string[] => {
  const received = new Set(
    receivedIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    ),
  );
  for (const id of handoffRegistry.keys()) {
    if (received.has(id)) {
      rnAckedIds.add(id);
    } else {
      rnAckedIds.delete(id);
    }
  }
  return resendUnacknowledgedExportSuccesses();
};

/** Re-post EXPORT_SUCCESS for uploads done on web that RN has not acked. */
export const resendUnacknowledgedExportSuccesses = (): string[] => {
  const resentIds: string[] = [];
  for (const [id, payload] of handoffRegistry) {
    if (rnAckedIds.has(id)) {
      continue;
    }
    if (deliverExportSuccess(payload)) {
      resentIds.push(id);
    }
  }
  return resentIds;
};

/** Ids with a completed web upload in this session — skip re-encode on resume. */
export const getUploadCompleteExportIds = (): string[] =>
  Array.from(handoffRegistry.keys());

export const postExportProgress = (payload: ExportProgressPayload): void => {
  try {
    postToRN('EXPORT_PROGRESS', payload);
  } catch {
    /* progress is best-effort */
  }
};

export const postExportSuccess = (payload: ExportSuccessPayload): void => {
  handoffRegistry.set(payload.id, payload);
  if (rnAckedIds.has(payload.id)) {
    return;
  }
  deliverExportSuccess(payload);
};

export const postPostExportFailed = (
  payload: PostExportFailedPayload,
): void => {
  postToRN('POST_EXPORT_FAILED', payload);
};

export const postPostExportAck = (payload: PostExportAckPayload): void => {
  postToRN('POST_EXPORT_ACK', payload);
};

export const getHandoffRegistrySizeForTests = (): number =>
  handoffRegistry.size;

export const getUnackedHandoffCountForTests = (): number => {
  let count = 0;
  for (const id of handoffRegistry.keys()) {
    if (!rnAckedIds.has(id)) {
      count += 1;
    }
  }
  return count;
};

export const resetExportSuccessHandoffForTests = (): void => {
  clearExportSuccessHandoff();
};

/** @deprecated */
export const getPendingExportSuccessCountForTests = (): number =>
  getUnackedHandoffCountForTests();

/** @deprecated */
export const resetPendingExportSuccessesForTests = (): void => {
  resetExportSuccessHandoffForTests();
};
