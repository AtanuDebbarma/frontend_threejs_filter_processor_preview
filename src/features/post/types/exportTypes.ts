export type {ExportMode} from '@/shared/types/exportMode';
export {isExportMode} from '@/shared/types/exportMode';
import type {ExportMode} from '@/shared/types/exportMode';

export type ExportDestination = 'gallery' | 's3';

/** Full-quality still export — photos always use these (4:5 / 9:16). */
export const EXPORT_DIMENSIONS_FULL: Record<
  ExportMode,
  {width: number; height: number}
> = {
  post: {width: 1080, height: 1350},
  reel: {width: 1080, height: 1920},
  story: {width: 1080, height: 1920},
};

/** Single-video WebCodecs encode targets. */
export const EXPORT_DIMENSIONS_VIDEO_SINGLE: Record<
  ExportMode,
  {width: number; height: number}
> = {
  post: {width: 1000, height: 1250},
  reel: {width: 1080, height: 1920},
  story: {width: 1080, height: 1920},
};

/** Multi-video batch encode (RAM / encode time). */
export const EXPORT_DIMENSIONS_VIDEO_BATCH: Record<
  ExportMode,
  {width: number; height: number}
> = {
  post: {width: 960, height: 1200},
  reel: {width: 960, height: 1712},
  story: {width: 960, height: 1712},
};

/** @deprecated Use EXPORT_DIMENSIONS_VIDEO_BATCH. */
export const EXPORT_DIMENSIONS_BATCH = EXPORT_DIMENSIONS_VIDEO_BATCH;

/** 4:5 carousel / post layout (vs 9:16 reel/story). */
export const isPostLayoutMode = (mode: ExportMode): boolean => mode === 'post';

/** @deprecated Use resolveExportDimensions — kept as alias for full post size. */
export const TARGET_DIMENSIONS = EXPORT_DIMENSIONS_FULL;

/** WebCodecs video encode — all carousel videos use this bitrate. */
export const VIDEO_EXPORT_BITRATE = 4_800_000;

export const VIDEO_EXPORT_FPS = 30;

export const resolveExportDimensions = (
  mode: ExportMode,
  mediaType: 'photo' | 'video',
  videoCountInFiles: number,
): {width: number; height: number} => {
  if (mediaType === 'photo') {
    return EXPORT_DIMENSIONS_FULL[mode];
  }
  if (videoCountInFiles > 1) {
    return EXPORT_DIMENSIONS_VIDEO_BATCH[mode];
  }
  return EXPORT_DIMENSIONS_VIDEO_SINGLE[mode];
};

/** Uses hydration `exportMode` for batch/full dimension tables. */
export const resolveExportDimensionsForMode = (
  exportMode: ExportMode,
  mediaType: 'photo' | 'video',
  videoCountInFiles: number,
): {width: number; height: number} =>
  resolveExportDimensions(exportMode, mediaType, videoCountInFiles);

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

/** RN → Web: attachment ids RN already recorded from EXPORT_SUCCESS. */
export type SyncExportStatePayload = {
  receivedIds: string[];
};

/** RN → Web: RN finished handling EXPORT_SUCCESS for one file. */
export type ExportSuccessAckPayload = {
  id: string;
  index: number;
};
