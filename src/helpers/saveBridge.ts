import type {
  ExportProgressPayload,
  SaveExportChunkPayload,
  SaveExportDataPayload,
  SaveExportFailedPayload,
  StartSaveExportPayload,
} from './exportTypes';
import {DEFAULT_SAVE_CHUNK_BYTES} from './exportTypes';
import {
  logSaveTechnical,
  reportSaveExportFailure,
  SaveExportStage,
} from './saveExportDiagnostics';

const postToRN = (type: string, payload: unknown) => {
  if (!window.ReactNativeWebView) {
    throw new Error('ReactNativeWebView bridge not available');
  }
  window.ReactNativeWebView.postMessage(JSON.stringify({type, payload}));
};

export const requestSaveToDevice = (id: string, index: number) => {
  try {
    postToRN('REQUEST_SAVE_TO_DEVICE', {id, index});
  } catch (err) {
    const technical = logSaveTechnical(SaveExportStage.REQUEST_BRIDGE, err, {
      id,
      index,
    });
    reportSaveExportFailure({
      id,
      error: technical,
      stage: SaveExportStage.REQUEST_BRIDGE,
    });
    throw err;
  }
};

export const postExportProgress = (payload: ExportProgressPayload): void => {
  try {
    postToRN('EXPORT_PROGRESS', payload);
  } catch {
    /* progress is best-effort */
  }
};

export const postSaveExportChunk = (payload: SaveExportChunkPayload): void => {
  postToRN('SAVE_EXPORT_CHUNK', payload);
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

export const sendSaveChunks = async (
  blob: Blob,
  opts: {
    id: string;
    index: number;
    chunkSizeBytes?: number;
    onProgress?: (percent: number) => void;
  },
): Promise<void> => {
  const chunkSize = opts.chunkSizeBytes ?? DEFAULT_SAVE_CHUNK_BYTES;
  const total = blob.size;
  if (total === 0) {
    throw new Error('Cannot send empty export blob');
  }

  let offset = 0;
  let seq = 0;

  while (offset < total) {
    const end = Math.min(offset + chunkSize, total);
    const slice = blob.slice(offset, end);
    const buffer = await slice.arrayBuffer();
    const dataBase64 = uint8ToBase64(new Uint8Array(buffer));
    const done = end >= total;

    postSaveExportChunk({
      id: opts.id,
      index: opts.index,
      seq,
      dataBase64,
      done,
    });

    opts.onProgress?.((end / total) * 100);
    offset = end;
    seq += 1;
  }
};

export const postSaveExportData = (payload: SaveExportDataPayload) => {
  try {
    postToRN('SAVE_EXPORT_DATA', payload);
  } catch (err) {
    logSaveTechnical(SaveExportStage.BRIDGE_POST_DATA, err, {
      id: payload.id,
      mediaType: payload.mediaType,
    });
    throw err;
  }
};

/** User snackbar + rnLogger technical (debug) — not gated by production. */
export const postSaveExportFailed = (payload: SaveExportFailedPayload) => {
  reportSaveExportFailure({
    ...payload,
    stage:
      (payload.stage as SaveExportStage | undefined) ??
      SaveExportStage.BRIDGE_POST_FAILED,
  });
};

export const isStartSaveExportPayload = (
  payload: unknown,
): payload is StartSaveExportPayload =>
  typeof payload === 'object' &&
  payload !== null &&
  typeof (payload as StartSaveExportPayload).id === 'string' &&
  typeof (payload as StartSaveExportPayload).index === 'number';
