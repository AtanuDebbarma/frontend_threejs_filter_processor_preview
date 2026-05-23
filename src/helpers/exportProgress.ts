import type {ExportProgressPayload, ExportProgressStage} from './exportTypes';
import {postExportProgress} from './saveBridge';

/** Throttle bridge posts: ~300 ms minimum between updates. */
export const createExportProgressReporter = (id: string) => {
  let lastPostMs = 0;
  let lastPercent = -1;

  return (
    percent: number,
    stage: ExportProgressStage,
    force = false,
    minIntervalMs = 300,
  ): void => {
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));
    const now = Date.now();
    if (!force && clamped === lastPercent && now - lastPostMs < minIntervalMs) {
      return;
    }
    if (!force && now - lastPostMs < minIntervalMs) {
      return;
    }
    lastPostMs = now;
    lastPercent = clamped;
    const payload: ExportProgressPayload = {id, percent: clamped, stage};
    postExportProgress(payload);
  };
};
