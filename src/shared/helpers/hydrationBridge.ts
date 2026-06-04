import type {ExportMode} from '@/shared/types/exportMode';
import {isExportMode} from '@/shared/types/exportMode';
import type {
  AppColors,
  HydrationPayload,
  Insets,
} from '@/shared/types/webBridgeTypes';
import type {MediaFile} from '@/shared/types/filterTypes';
import {
  applyHydrationData,
  trimBase64,
} from '@/features/post/helpers/canvas/other_helpers';
import {configureEditorLogging, rnLogger} from '@/shared/utils/rnLogger';
import type {Dispatch, SetStateAction} from 'react';

export const postMessageToRN = (type: string, payload: unknown = {}): void => {
  if (!window.ReactNativeWebView) {
    return;
  }
  window.ReactNativeWebView.postMessage(JSON.stringify({type, payload}));
};

export type ApplyHydrationOptions = {
  setMediaFiles: (files: MediaFile[] | []) => void;
  setExportMode: Dispatch<SetStateAction<ExportMode>>;
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

  const exportMode: ExportMode = isExportMode(data.exportMode)
    ? data.exportMode
    : 'post';
  if (!isExportMode(data.exportMode)) {
    rnLogger.warn(
      `${source}: invalid exportMode "${String(data.exportMode)}", defaulting to post`,
    );
  }

  await applyHydrationData(
    {...data, exportMode},
    source,
    options.setMediaFiles,
    options.setExportMode,
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
