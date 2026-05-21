import {rnLogger} from '../utils/rnLogger';
import type {
  SaveExportDataPayload,
  SaveExportFailedPayload,
  StartSaveExportPayload,
} from './exportTypes';

const postToRN = (type: string, payload: unknown) => {
  if (!window.ReactNativeWebView) {
    throw new Error('ReactNativeWebView bridge not available');
  }
  window.ReactNativeWebView.postMessage(JSON.stringify({type, payload}));
};

export const requestSaveToDevice = (id: string, index: number) => {
  rnLogger.log(`💾 REQUEST_SAVE_TO_DEVICE id=${id} index=${index}`);
  postToRN('REQUEST_SAVE_TO_DEVICE', {id, index});
};

export const postSaveExportData = (payload: SaveExportDataPayload) => {
  postToRN('SAVE_EXPORT_DATA', payload);
};

export const postSaveExportFailed = (payload: SaveExportFailedPayload) => {
  postToRN('SAVE_EXPORT_FAILED', payload);
};

export const isStartSaveExportPayload = (
  payload: unknown,
): payload is StartSaveExportPayload =>
  typeof payload === 'object' &&
  payload !== null &&
  typeof (payload as StartSaveExportPayload).id === 'string' &&
  typeof (payload as StartSaveExportPayload).index === 'number';
