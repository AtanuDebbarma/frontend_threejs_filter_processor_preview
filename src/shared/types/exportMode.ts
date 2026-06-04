/** Layout / export mode from RN hydration — shared across post, reel, story. */
export type ExportMode = 'post' | 'reel' | 'story';

export const isExportMode = (value: unknown): value is ExportMode =>
  value === 'post' || value === 'reel' || value === 'story';
