/**
 * Save-to-gallery user copy (web → RN `SAVE_EXPORT_FAILED`).
 * Technical details: `saveExportDiagnostics` → rnLogger (`WEB_LOG` when production=false).
 * User snackbar: `reportSaveExportFailure` → `SAVE_EXPORT_FAILED` (always).
 */

export const SAVE_FAILED_GENERIC =
  "Couldn't save to your gallery. Please try again.";

export type SaveExportMediaType = 'photo' | 'video';

type FailureRule = {
  needles: string[];
  photo?: string;
  video?: string;
  message?: string;
};

/** First match wins. Keep needles lowercase-friendly via includesAny. */
const FAILURE_RULES: FailureRule[] = [
  // --- Bridge / request (web + RN) ---
  {
    needles: ['reactnativewebview', 'bridge not available'],
    message: "Save isn't available right now. Close and reopen the editor.",
  },
  {
    needles: ['invalid payload', 'start_save_export'],
    message: "Couldn't start saving. Close the editor and try again.",
  },
  {
    needles: ['unknown asset', 'no media at index', 'missing id/index'],
    message: "This item isn't in the editor anymore. Go back and try again.",
  },
  // --- Codec / WebCodecs (web encode) ---
  {
    needles: [
      'h.264',
      'h264',
      'video encoding is not supported',
      'encoding is not supported on this device',
      'webcodecs',
      'not supported on this device',
    ],
    video: "Video saving isn't supported on this device. Try a physical phone.",
    photo: "Couldn't save the photo on this device. Try again.",
  },
  // --- Read source file (XHR / fetch) ---
  {
    needles: [
      'failed to fetch',
      'xhr error',
      'failed to read local media',
      'failed to read video',
      'failed to fetch media',
      '0 bytes',
    ],
    video: "Couldn't read the video file. Close the editor and try again.",
    photo: "Couldn't read the photo file. Close the editor and try again.",
  },
  // --- Preview / canvas readiness (web) ---
  {
    needles: ['preview canvas not ready', 'canvas not ready', 'still loading'],
    message: 'The editor is still loading. Wait a moment, then tap Save again.',
  },
  {
    needles: ['video element not ready', "video isn't ready"],
    message:
      "The video isn't ready yet. Wait for the preview to load, then try Save again.",
  },
  {
    needles: ['seek timed out', 'video seek'],
    message:
      'This video took too long to process. Try a shorter clip or save again.',
  },
  // --- Photo encode (canvas / toBlob) ---
  {
    needles: [
      'toblob returned null',
      '2d canvas unavailable',
      'canvas context',
    ],
    photo: "Couldn't prepare the photo for saving. Try again.",
  },
  // --- Mux / conversion (web video) ---
  {
    needles: ['configuration invalid', 'discarded', 'conversion'],
    video:
      "Couldn't save this video with the current settings. Try a shorter clip.",
  },
  {
    needles: ['empty file', 'produced an empty', 'export produced an empty'],
    photo: "Couldn't save the photo. The export was empty. Try again.",
    video: "Couldn't save the video. Try a shorter clip or save again.",
  },
  // --- Base64 / handoff (web) ---
  {
    needles: [
      'failed to read export blob',
      'filereader',
      'file reader',
      'export failed',
    ],
    message: "Couldn't prepare the file for saving. Try again.",
  },
  {
    needles: ['video uri missing', 'uri missing for export'],
    video: 'This video is missing. Go back and add your media again.',
  },
  // --- RN write / gallery (also used if RN passes technical string back) ---
  {
    needles: ['permission to access media library', 'permission denied'],
    message: 'Allow photo library access in Settings, then try Save again.',
  },
  {
    needles: ['savetogallery returned null', 'failed to save to gallery'],
    message:
      "Couldn't add the file to your gallery. Check storage space and try again.",
  },
  {
    needles: ['writeasstringasync', 'writefile', 'enoent', 'no space'],
    message:
      "Couldn't store the save file on your device. Free up space and try again.",
  },
  {
    needles: ['missing id or exportbase64', 'missing export'],
    message: "Couldn't receive the saved file from the editor. Try again.",
  },
  {
    needles: ['start_save_export postmessage failed', 'postmessage failed'],
    message:
      "Couldn't reach the editor to save. Close and reopen, then try again.",
  },
];

const includesAny = (haystack: string, needles: string[]): boolean => {
  const lower = haystack.toLowerCase();
  return needles.some(n => lower.includes(n.toLowerCase()));
};

export const getTechnicalSaveErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message.trim() || SAVE_FAILED_GENERIC;
  }
  if (typeof err === 'string') {
    return err.trim() || SAVE_FAILED_GENERIC;
  }
  return SAVE_FAILED_GENERIC;
};

const pickMediaMessage = (
  rule: FailureRule,
  mediaType?: SaveExportMediaType,
): string | undefined => {
  if (rule.message) {
    return rule.message;
  }
  if (mediaType === 'photo' && rule.photo) {
    return rule.photo;
  }
  if (mediaType === 'video' && rule.video) {
    return rule.video;
  }
  return rule.message ?? rule.photo ?? rule.video;
};

/**
 * Maps a technical Save failure to user-facing snackbar copy.
 * Safe to call in production — does not depend on rnLogger.
 */
export const formatSaveExportUserMessage = (
  technicalMessage: string,
  mediaType?: SaveExportMediaType,
): string => {
  const msg = technicalMessage.trim();
  if (!msg) {
    return SAVE_FAILED_GENERIC;
  }

  for (const rule of FAILURE_RULES) {
    if (!includesAny(msg, rule.needles)) {
      continue;
    }
    const picked = pickMediaMessage(rule, mediaType);
    if (picked) {
      return picked;
    }
  }

  return SAVE_FAILED_GENERIC;
};

export type SaveExportFailurePayload = {
  id: string;
  technicalError: string;
  mediaType?: SaveExportMediaType;
};

/** User message + technical for RN (`error` = UX, `technicalError` = dev logs). */
export const buildSaveExportFailurePayload = (
  input: SaveExportFailurePayload,
): {id: string; error: string; technicalError: string} => {
  const technical = input.technicalError.trim() || SAVE_FAILED_GENERIC;
  return {
    id: input.id,
    technicalError: technical,
    error: formatSaveExportUserMessage(technical, input.mediaType),
  };
};
