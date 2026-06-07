/** Non-fatal stop — app background / RN CANCEL_POST_EXPORT (resume later). */
export class PostExportPausedError extends Error {
  constructor(message = 'Post export paused') {
    super(message);
    this.name = 'PostExportPausedError';
  }
}

export function isPostExportPausedError(error: unknown): boolean {
  return (
    error instanceof PostExportPausedError ||
    (error instanceof Error && error.name === 'PostExportPausedError')
  );
}
