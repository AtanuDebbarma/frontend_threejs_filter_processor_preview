import type {
  SaveExportDataPayload,
  SaveExportFailedPayload,
  StartSaveExportPayload,
} from './exportTypes';
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
