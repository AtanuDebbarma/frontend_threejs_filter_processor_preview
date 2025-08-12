// /utils/filter_utils.ts
// ---------------------- Module-scope cache & helpers ----------------------

import type {RefObject} from 'react';

/**
 * Schedule a delayed clear of the `isApplyingFilter` global zustand state.
 * This function is used to create a "grace period" where the app is applying a filter,
 * and should be called when the app is done applying the filter.
 *
 * If `immediate` is true, the state is cleared immediately, and any pending timeouts are cleared.
 * Otherwise, a timeout is set to clear the state after a minimum of `MIN_APPLY_MS` milliseconds
 * from the time `setIsApplyingFilter(true)` was called (tracked by `applyingStartRef`).
 *
 * The `didSetApplyingRef` ref is used to track whether this instance of `scheduleClearApplying`
 * set the flag, and should be cleared when this instance is done.
 *
 * The `pendingClearRef` ref is used to track and cancel any previously set timeout.
 *
 * @param immediate - whether to clear the state immediately
 * @param didSetApplyingRef - a ref that tracks whether this instance set the `isApplyingFilter` flag
 * @param pendingClearRef - a ref that tracks and cancels any previously set timeout
 * @param setIsApplyingFilter - a function that sets the `isApplyingFilter` flag
 * @param applyingStartRef - a ref that tracks the time `setIsApplyingFilter(true)` was called
 */
export const scheduleClearApplying = (
  immediate = false,
  didSetApplyingRef: RefObject<boolean>,
  pendingClearRef: RefObject<number | null>,
  setIsApplyingFilter: (loading: boolean) => Promise<void>,
  applyingStartRef: RefObject<number | null>,
) => {
  const MIN_APPLY_MS = 200;

  // only clear if this instance set the flag
  if (!didSetApplyingRef.current) return;

  // cancel any previous pending timeout
  if (pendingClearRef.current) {
    window.clearTimeout(pendingClearRef.current);
    pendingClearRef.current = null;
  }

  if (immediate) {
    // clear immediately (used on unmount / hard error)
    setIsApplyingFilter(false).catch(() => {});
    didSetApplyingRef.current = false;
    applyingStartRef.current = null;
    return;
  }

  const start = applyingStartRef.current ?? 0;
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, MIN_APPLY_MS - elapsed);

  if (remaining === 0) {
    setIsApplyingFilter(false).catch(() => {});
    didSetApplyingRef.current = false;
    applyingStartRef.current = null;
  } else {
    pendingClearRef.current = window.setTimeout(() => {
      setIsApplyingFilter(false).catch(() => {});
      didSetApplyingRef.current = false;
      applyingStartRef.current = null;
      pendingClearRef.current = null;
    }, remaining);
  }
};
