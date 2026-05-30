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

export type ExportProgressStage = 'encoding' | 'writing';

/** Post export progress (Save uses `encoding` | `writing` only). */
export type PostExportProgressStage = 'encoding' | 'uploading';

export type ExportProgressPayload = {
  id: string;
  percent: number;
  stage: ExportProgressStage | PostExportProgressStage;
  fileIndex?: number;
  fileCount?: number;
};

/** Photos: single base64 message when under size cap. Videos: chunked mux (Phase E). */
export const SAVE_PHOTO_MAX_BLOB_BYTES = 5 * 1024 * 1024;

export const DEFAULT_SAVE_CHUNK_BYTES = 512 * 1024;

export type StartSaveExportPayload = {
  id: string;
  index: number;
  mode: ExportMode;
  destination: 'gallery';
  /** Optional — web resolves via resolveExportDimensions if omitted. */
  width?: number;
  height?: number;
  /** RN pre-created file path for video chunked Save. */
  writePath?: string;
  mime?: string;
  chunkSizeBytes?: number;
};

export type SaveExportChunkPayload = {
  id: string;
  index: number;
  seq: number;
  dataBase64: string;
  done?: boolean;
};

export type SaveExportCompletePayload = {
  id: string;
  localPath: string;
  mediaType: 'photo' | 'video';
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
  /** Technical message (mapped to user copy in saveBridge). */
  error: string;
  mediaType?: 'photo' | 'video';
  /** RN devtools filter: `[Save:STAGE]` in rnLogger. */
  stage?: string;
};

/** RN snackbar + optional native log — `error` is user-facing. */
export type SaveExportFailedMessage = {
  id: string;
  error: string;
  technicalError?: string;
  mediaType?: 'photo' | 'video';
};

export type PostExportItem = {
  id: string;
  index: number;
  mediaType: 'photo' | 'video';
};

export type StartPostExportPayload = {
  mode: 'post';
  destination: 's3';
  fileCount: number;
  items: PostExportItem[];
};

export type ExportSuccessPayload = {
  id: string;
  index: number;
  s3Url: string;
  mediaType: 'photo' | 'video';
  fileIndex?: number;
  fileCount?: number;
};

export type PostExportFailedPayload = {
  id?: string;
  error: string;
  technicalError?: string;
  mediaType?: 'photo' | 'video';
  fileIndex?: number;
  fileCount?: number;
};

export type PostExportAckPayload = {
  fileCount: number;
};
