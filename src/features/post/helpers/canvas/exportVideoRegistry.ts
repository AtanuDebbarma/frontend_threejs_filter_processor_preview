/** Hidden <video> per slide — preview playback only (export uses Mediabunny decode). */
const exportVideoByIndex = new Map<number, HTMLVideoElement>();

export const setExportVideo = (
  index: number,
  video: HTMLVideoElement | null,
): void => {
  if (video) {
    exportVideoByIndex.set(index, video);
  } else {
    exportVideoByIndex.delete(index);
  }
};

export const getExportVideo = (index: number): HTMLVideoElement | null =>
  exportVideoByIndex.get(index) ?? null;

export const forEachExportVideo = (
  fn: (video: HTMLVideoElement, index: number) => void,
): void => {
  exportVideoByIndex.forEach(fn);
};

export const clearExportVideos = (): void => {
  exportVideoByIndex.clear();
};
