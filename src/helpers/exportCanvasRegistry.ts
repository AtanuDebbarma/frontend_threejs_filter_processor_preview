/** WebGL canvases per slide — kept outside Zustand/Immer (DOM nodes are not draft-safe). */
const exportCanvasByIndex = new Map<number, HTMLCanvasElement>();

export type ExportRenderer = {
  invalidate: () => void;
};

const exportRendererByIndex = new Map<number, ExportRenderer>();

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

export const setExportRenderer = (
  index: number,
  renderer: ExportRenderer | null,
): void => {
  if (renderer) {
    exportRendererByIndex.set(index, renderer);
  } else {
    exportRendererByIndex.delete(index);
  }
};

export const getExportRenderer = (index: number): ExportRenderer | null =>
  exportRendererByIndex.get(index) ?? null;

export const clearExportCanvases = (): void => {
  exportCanvasByIndex.clear();
  exportRendererByIndex.clear();
};
