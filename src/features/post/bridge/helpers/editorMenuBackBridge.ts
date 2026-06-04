/** Lets {@link performEditorBack} pop EditorMenu sub-views before leaving the editor. */
let editorMenuBackHandler: (() => boolean) | null = null;

export function registerEditorMenuBackHandler(
  handler: (() => boolean) | null,
): void {
  editorMenuBackHandler = handler;
}

export function runEditorMenuBack(): boolean {
  return editorMenuBackHandler?.() ?? false;
}

/** AdjustMenu transform reset + navigation is owned by the mounted menu. */
let adjustMenuBackHandler: (() => boolean) | null = null;

export function registerAdjustMenuBackHandler(
  handler: (() => boolean) | null,
): void {
  adjustMenuBackHandler = handler;
}

export function runAdjustMenuBack(): boolean {
  return adjustMenuBackHandler?.() ?? false;
}
