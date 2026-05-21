export type ExportMode = 'post' | 'reel' | 'story';

export type ExportDestination = 'gallery' | 's3';

export const TARGET_DIMENSIONS: Record<
  ExportMode,
  {width: number; height: number}
> = {
  post: {width: 864, height: 1080},
  reel: {width: 864, height: 1536},
  story: {width: 864, height: 1536},
};

export type StartSaveExportPayload = {
  id: string;
  index: number;
  mode: ExportMode;
  destination: 'gallery';
  width: number;
  height: number;
};

export type SaveExportDataPayload = {
  id: string;
  exportBase64: string;
  mediaType: 'photo' | 'video';
  filename: string;
  mimeType: string;
};

export type SaveExportFailedPayload = {
  id: string;
  error: string;
};
