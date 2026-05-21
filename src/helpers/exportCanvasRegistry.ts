/** WebGL canvases per slide — kept outside Zustand/Immer (DOM nodes are not draft-safe). */
const exportCanvasByIndex = new Map<number, HTMLCanvasElement>();

export const setExportCanvas = (
  index: number,
  canvas: HTMLCanvasElement | null,
): void => {
  if (canvas) {
    exportCanvasByIndex.set(index, canvas);
  } else {
    exportCanvasByIndex.delete(index);
  }
};

export const getExportCanvas = (index: number): HTMLCanvasElement | null =>
  exportCanvasByIndex.get(index) ?? null;

export const clearExportCanvases = (): void => {
  exportCanvasByIndex.clear();
};
