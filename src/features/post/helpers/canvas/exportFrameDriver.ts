export type ExportFrameDriver = {
  paintAndRender: (frame: VideoFrame) => void;
};

const drivers = new Map<number, ExportFrameDriver>();

export const setExportFrameDriver = (
  index: number,
  driver: ExportFrameDriver | null,
): void => {
  if (driver) {
    drivers.set(index, driver);
  } else {
    drivers.delete(index);
  }
};

export const getExportFrameDriver = (index: number): ExportFrameDriver | null =>
  drivers.get(index) ?? null;
