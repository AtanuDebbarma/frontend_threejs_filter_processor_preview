export type ExportMode = 'post' | 'reel' | 'story';

export type ExportDestination = 'gallery' | 's3';

/** Full-quality export — images, single-video Save, Post when one video (4:5 / 9:16). */
export const EXPORT_DIMENSIONS_FULL: Record<
  ExportMode,
  {width: number; height: number}
> = {
  post: {width: 1080, height: 1350},
  reel: {width: 1080, height: 1920},
  story: {width: 1080, height: 1920},
};

/**
 * Lower resolution for Post batch when **multiple videos** (RAM / encode time).
 * Images always use EXPORT_DIMENSIONS_FULL.
 */
export const EXPORT_DIMENSIONS_BATCH: Record<
  ExportMode,
  {width: number; height: number}
> = {
  post: {width: 864, height: 1080},
  reel: {width: 864, height: 1536},
  story: {width: 864, height: 1536},
};

/** @deprecated Use resolveExportDimensions — kept as alias for full post size. */
export const TARGET_DIMENSIONS = EXPORT_DIMENSIONS_FULL;

/** WebCodecs video encode — unchanged when bumping still frame size. */
export const VIDEO_EXPORT_FPS = 30;

export const resolveExportDimensions = (
  mode: ExportMode,
  mediaType: 'photo' | 'video',
  videoCountInFiles: number,
): {width: number; height: number} => {
  const useBatchVideo = mediaType === 'video' && videoCountInFiles > 1;
  return useBatchVideo
    ? EXPORT_DIMENSIONS_BATCH[mode]
    : EXPORT_DIMENSIONS_FULL[mode];
};

export type StartSaveExportPayload = {
  id: string;
  index: number;
  mode: ExportMode;
  destination: 'gallery';
  /** Optional — web resolves via resolveExportDimensions if omitted. */
  width?: number;
  height?: number;
};

export type SaveExportDataPayload = {
  id: string;
  exportBase64: string;
  mediaType: 'photo' | 'video';
  filename: string;
  mimeType: string;
  width: number;
  height: number;
};

export type SaveExportFailedPayload = {
  id: string;
  error: string;
};
