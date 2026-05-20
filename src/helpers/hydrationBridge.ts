import type {
  AppColors,
  HydrationPayload,
  Insets,
} from '../types/webBridgeTypes';
import type {MediaFile} from '../types/filterTypes';
import {applyHydrationData, trimUriForLog} from './other_helpers';
import {configureEditorLogging, rnLogger} from '../utils/rnLogger';
import type {Dispatch, SetStateAction} from 'react';

/** RN static-server URLs served from loopback (Phase 4). */
export const isLocalhostMediaUrl = (url: string): boolean =>
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(url);

export const postMessageToRN = (type: string, payload: unknown = {}): void => {
  if (!window.ReactNativeWebView) {
    return;
  }
  window.ReactNativeWebView.postMessage(JSON.stringify({type, payload}));
};

export type ApplyHydrationOptions = {
  setMediaFiles: (files: MediaFile[] | []) => void;
  setPost: Dispatch<SetStateAction<boolean>>;
  setAppColors: Dispatch<SetStateAction<AppColors>>;
  setSafeInsets: Dispatch<SetStateAction<Insets>>;
  setDpr: (dpr: number) => void;
};

export const applyHydrationFromPayload = async (
  data: HydrationPayload,
  source: string,
  options: ApplyHydrationOptions,
): Promise<void> => {
  if (!data?.file?.length) {
    rnLogger.warn(`⚠️ ${source}: empty file list`);
    return;
  }

  if (typeof data.production === 'boolean') {
    configureEditorLogging({production: data.production});
  }

  const hasLocalhost = data.file.some(f => isLocalhostMediaUrl(f.uri));
  const logPayload = trimUriForLog({files: data.file});
  rnLogger.log(
    `📥 ${source} (${data.file.length} file(s)${hasLocalhost ? ', localhost static server' : ''}):`,
    logPayload,
  );

  await applyHydrationData(
    data,
    source,
    options.setMediaFiles,
    options.setPost,
  );

  if (data.appColors) {
    options.setAppColors(data.appColors);
  }
  if (data.insets) {
    options.setSafeInsets(data.insets);
  }
  if (data.dpr != null) {
    options.setDpr(data.dpr);
  }
};
