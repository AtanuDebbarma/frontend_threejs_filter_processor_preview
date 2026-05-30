import type {
  AppColors,
  HydrationPayload,
  Insets,
} from '../types/webBridgeTypes';
import type {MediaFile} from '../types/filterTypes';
import {applyHydrationData, trimBase64} from './other_helpers';
import {configureEditorLogging, rnLogger} from '../utils/rnLogger';
import type {Dispatch, SetStateAction} from 'react';

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
  setPostUploadEndpointUrl?: (url: string | null) => void;
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

  const logPayload = trimBase64({files: data.file});
  rnLogger.log(`📥 ${source} (${data.file.length} file(s)):`, logPayload);

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
  if (data.uploadEndpoint && options.setPostUploadEndpointUrl) {
    options.setPostUploadEndpointUrl(data.uploadEndpoint);
    rnLogger.log('📥 Post upload endpoint set from hydration');
  }
};
