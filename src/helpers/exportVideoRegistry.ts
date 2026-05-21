/** Hidden <video> elements per slide — for Save export seek/sync. */
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

export const clearExportVideos = (): void => {
  exportVideoByIndex.clear();
};
