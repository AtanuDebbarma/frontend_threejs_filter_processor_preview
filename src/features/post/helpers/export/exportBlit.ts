import {
  assertSaveExport,
  SaveExportStage,
} from '@/features/post/bridge/helpers/saveExportDiagnostics';

/** Cover-fit WebGL canvas into fixed export framebuffer (preview parity). */
export const blitCanvasToExportSize = (
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  backgroundColor: string,
  reuseTarget?: HTMLCanvasElement,
): HTMLCanvasElement => {
  const out = reuseTarget ?? document.createElement('canvas');
  out.width = targetWidth;
  out.height = targetHeight;
  const ctx = out.getContext('2d');
  assertSaveExport(
    ctx,
    SaveExportStage.VALIDATE_CANVAS,
    '2D canvas unavailable for export',
  );

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const sw = Math.max(1, source.width);
  const sh = Math.max(1, source.height);
  const scale = Math.max(targetWidth / sw, targetHeight / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const ox = (targetWidth - dw) / 2;
  const oy = (targetHeight - dh) / 2;

  ctx.drawImage(source, ox, oy, dw, dh);
  return out;
};
