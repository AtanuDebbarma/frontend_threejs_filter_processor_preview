import {TEXT_FLOW_BUTTONS} from '@/features/post/constants/textFlowButtons';
import type {MenuChromeKind} from '@/features/post/helpers/menuChrome/menuChromeClasses';
import {appStore} from '@/store/appStore';
import type {ButtonStateType} from '@/store/buttonSlices';

export type {MenuChromeKind} from '@/features/post/helpers/menuChrome/menuChromeClasses';

/** Matches existing tap feedback delay — state still commits here for RN sync. */
export const MENU_NAV_TAP_DELAY_MS = 200;

/** Footer / overlay animation length (~native sheet feel, not snappy). */
export const MENU_CHROME_ANIM_MS = 280;

let pendingTimeoutId: ReturnType<typeof setTimeout> | null = null;
let unlockFallbackId: ReturnType<typeof setTimeout> | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsViewTransition(): boolean {
  return (
    typeof document.startViewTransition === 'function' &&
    !prefersReducedMotion()
  );
}

function clearUnlockFallback(): void {
  if (unlockFallbackId) {
    clearTimeout(unlockFallbackId);
    unlockFallbackId = null;
  }
}

export function beginMenuChromeTransition(kind: MenuChromeKind): void {
  const {setMenuChromeTransitioning, setMenuChromeTransitionKind} =
    appStore.getState();
  setMenuChromeTransitionKind(kind);
  setMenuChromeTransitioning(true);
}

export function endMenuChromeTransition(): void {
  clearUnlockFallback();
  const {setMenuChromeTransitioning, setMenuChromeTransitionKind} =
    appStore.getState();
  setMenuChromeTransitioning(false);
  setMenuChromeTransitionKind(null);
}

function armUnlockFallback(): void {
  clearUnlockFallback();
  unlockFallbackId = window.setTimeout(() => {
    unlockFallbackId = null;
    endMenuChromeTransition();
  }, MENU_CHROME_ANIM_MS + 80);
}

function runWithViewTransition(apply: () => void, kind: MenuChromeKind): void {
  const finish = () => {
    clearUnlockFallback();
    endMenuChromeTransition();
  };

  const shouldUseViewTransition =
    supportsViewTransition() &&
    (kind === 'footer' || kind === 'adjust-overlay');

  if (!shouldUseViewTransition) {
    apply();
    window.setTimeout(finish, MENU_CHROME_ANIM_MS);
    armUnlockFallback();
    return;
  }

  const transition = document.startViewTransition(apply);
  transition.finished.then(finish).catch(finish);
  armUnlockFallback();
}

export function cancelMenuChromeNavigation(): void {
  if (pendingTimeoutId) {
    clearTimeout(pendingTimeoutId);
    pendingTimeoutId = null;
  }
  endMenuChromeTransition();
}

export function resolveMenuChromeKindForButton(
  from: ButtonStateType,
  to: ButtonStateType,
): MenuChromeKind {
  if (to === 'adjust') {
    return 'adjust-overlay';
  }
  if (
    to &&
    TEXT_FLOW_BUTTONS.has(to) &&
    (!from || !TEXT_FLOW_BUTTONS.has(from))
  ) {
    return 'overlay-enter';
  }
  return 'footer';
}

/**
 * Schedules a menu navigation: 200ms tap delay, then state commit (RN sync),
 * then visual transition. State timing matches the previous setTimeout pattern.
 */
export function scheduleMenuChromeNavigation(
  apply: () => void,
  kind: MenuChromeKind = 'footer',
): void {
  cancelMenuChromeNavigation();
  beginMenuChromeTransition(kind);

  pendingTimeoutId = window.setTimeout(() => {
    pendingTimeoutId = null;
    runWithViewTransition(apply, kind);
  }, MENU_NAV_TAP_DELAY_MS);
}

export function scheduleSetActiveButton(button: ButtonStateType): void {
  const state = appStore.getState();
  const kind = resolveMenuChromeKindForButton(state.activeButton, button);
  scheduleMenuChromeNavigation(() => state.setActiveButton(button), kind);
}

export function scheduleMenuChromeBack(apply: () => void): void {
  scheduleMenuChromeNavigation(apply, 'footer');
}

export function scheduleSetTagMode(enabled: boolean): void {
  if (!enabled) {
    appStore.getState().setTagMode(false);
    return;
  }
  scheduleMenuChromeNavigation(
    () => appStore.getState().setTagMode(true),
    'adjust-overlay',
  );
}

/** Immediate state commit (e.g. web back without extra 200ms) with optional visual transition. */
export function runMenuChromeNavigationImmediate(
  apply: () => void,
  kind: MenuChromeKind = 'footer',
): void {
  cancelMenuChromeNavigation();
  beginMenuChromeTransition(kind);
  runWithViewTransition(apply, kind);
}
