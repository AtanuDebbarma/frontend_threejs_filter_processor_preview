/**
 * Save pipeline logging for RN devtools (`WEB_LOG` when production=false).
 * User snackbar path is separate (postSaveExportFailed) and always runs.
 */

import {fnLog} from '../utils/rnLogger';
import {
  buildSaveExportFailurePayload,
  getTechnicalSaveErrorMessage,
} from './saveExportUserMessage';
import type {
  SaveExportFailedMessage,
  SaveExportFailedPayload,
} from './exportTypes';

/** Stages for grep / RN log filter: `[Save:STAGE]` */
export const SaveExportStage = {
  REQUEST_BRIDGE: 'REQUEST_BRIDGE',
  INVALID_START_PAYLOAD: 'INVALID_START_PAYLOAD',
  EXPORT_ORCHESTRATOR: 'EXPORT_ORCHESTRATOR',
  VALIDATE_MEDIA: 'VALIDATE_MEDIA',
  VALIDATE_CANVAS: 'VALIDATE_CANVAS',
  PHOTO_TO_BLOB: 'PHOTO_TO_BLOB',
  VIDEO_URI: 'VIDEO_URI',
  VIDEO_VALIDATE: 'VIDEO_VALIDATE',
  VIDEO_CODEC: 'VIDEO_CODEC',
  VIDEO_AUDIO_READ: 'VIDEO_AUDIO_READ',
  VIDEO_ENCODE_LOOP: 'VIDEO_ENCODE_LOOP',
  VIDEO_MUX_FINALIZE: 'VIDEO_MUX_FINALIZE',
  VIDEO_EMPTY_OUTPUT: 'VIDEO_EMPTY_OUTPUT',
  BASE64_ENCODE: 'BASE64_ENCODE',
  BRIDGE_POST_DATA: 'BRIDGE_POST_DATA',
  BRIDGE_POST_FAILED: 'BRIDGE_POST_FAILED',
  MESSAGE_HANDLER: 'MESSAGE_HANDLER',
} as const;

export type SaveExportStage =
  (typeof SaveExportStage)[keyof typeof SaveExportStage];

const formatExtra = (extra?: Record<string, unknown>): string =>
  extra && Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';

/**
 * Log technical Save issue to rnLogger (→ RN in debug). Returns technical string.
 */
export const logSaveTechnical = (
  stage: SaveExportStage,
  err: unknown,
  extra?: Record<string, unknown>,
): string => {
  const technical = getTechnicalSaveErrorMessage(err);
  fnLog(
    `Save:${stage}`,
    'error',
    technical + formatExtra(extra),
    err instanceof Error ? err : undefined,
  );
  return technical;
};

/** Non-fatal Save path (e.g. audio mux skipped). */
export const logSaveWarn = (
  stage: SaveExportStage,
  err: unknown,
  extra?: Record<string, unknown>,
): string => {
  const technical = getTechnicalSaveErrorMessage(err);
  fnLog(
    `Save:${stage}`,
    'warn',
    technical + formatExtra(extra),
    err instanceof Error ? err : undefined,
  );
  return technical;
};

/** Log + throw so upstream catch can postSaveExportFailed. */
export const throwSaveExportError = (
  stage: SaveExportStage,
  message: string,
): never => {
  fnLog(`Save:${stage}`, 'error', message);
  throw new Error(message);
};

/** Narrows after guard; use before code that needs a definite value. */
export function assertSaveExport<T>(
  value: T | null | undefined,
  stage: SaveExportStage,
  message: string,
): asserts value is T {
  if (value == null) {
    throwSaveExportError(stage, message);
  }
}

export function assertSaveExportCondition(
  condition: boolean,
  stage: SaveExportStage,
  message: string,
): asserts condition {
  if (!condition) {
    throwSaveExportError(stage, message);
  }
}

const postSaveFailedMessage = (message: SaveExportFailedMessage): void => {
  if (!window.ReactNativeWebView) {
    throw new Error('ReactNativeWebView bridge not available');
  }
  window.ReactNativeWebView.postMessage(
    JSON.stringify({type: 'SAVE_EXPORT_FAILED', payload: message}),
  );
};

export type SaveExportFailedReport = SaveExportFailedPayload & {
  stage?: SaveExportStage | string;
};

/**
 * Debug: rnLogger (technical + user + stage).
 * Production: still posts SAVE_EXPORT_FAILED for snackbar.
 */
export const reportSaveExportFailure = (
  report: SaveExportFailedReport,
): void => {
  const stage = report.stage ?? SaveExportStage.BRIDGE_POST_FAILED;
  const built = buildSaveExportFailurePayload({
    id: report.id,
    technicalError: report.error,
    mediaType: report.mediaType,
  });

  fnLog(
    `Save:${stage}`,
    'error',
    `technical=${built.technicalError} | user="${built.error}"`,
    {id: report.id, mediaType: report.mediaType},
  );

  try {
    postSaveFailedMessage({
      id: built.id,
      error: built.error,
      technicalError: built.technicalError,
      mediaType: report.mediaType,
    });
  } catch (postErr) {
    logSaveTechnical(SaveExportStage.BRIDGE_POST_FAILED, postErr, {
      id: report.id,
      stage,
    });
  }
};
