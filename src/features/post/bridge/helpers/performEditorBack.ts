import {TEXT_FLOW_BUTTONS} from '@/features/post/constants/textFlowButtons';
import {
  runAdjustMenuBack,
  runEditorMenuBack,
} from '@/features/post/bridge/helpers/editorMenuBackBridge';
import {appStore} from '@/store/appStore';
import type {ButtonStateType} from '@/store/buttonSlices';

/** True when hardware/RN back should show the leave–create-post prompt. */
export function isEditorMenuRoot(activeButton: ButtonStateType): boolean {
  return activeButton === 'mainMenu' || activeButton === null;
}

/** FilterMenu, PlaceholderFeatureMenu (sticker/audio). */
export function navigateBackFromFeatureMenu(): void {
  appStore.getState().setActiveButton('mainMenu');
}

/** EditorMenuMain. */
export function navigateBackFromEditorMainMenu(): void {
  navigateBackFromFeatureMenu();
}

/** EditorMenu — leaving the sliders hub (not a sub-filter view). */
export function navigateBackFromEditorSliders(): void {
  appStore.getState().setActiveButton('editorMainMenu');
}

/** FontStyleMenu, TextBackgroundMenu, text color pickers. */
export function navigateBackToTextMenu(): void {
  appStore.getState().setActiveButton('text');
}

/** TextContentOverlayArea X — color modes return to text; else leave text flow. */
export function navigateBackFromTextOverlay(): void {
  const {activeButton} = appStore.getState();
  if (activeButton === 'textColor' || activeButton === 'textBackgroundColor') {
    navigateBackToTextMenu();
    return;
  }
  navigateBackFromTextFlow();
}

/** Text overlay / text menu — prune empty layers and return to editor hub. */
export function navigateBackFromTextFlow(): void {
  const state = appStore.getState();
  const attachmentId = state.mediaFiles[state.activeIndex]?.id;
  if (attachmentId) {
    state.pruneEmptyTextLayers(state.activeIndex, attachmentId);
  }
  state.setActiveButton('editorMainMenu');
}

/**
 * One step of in-editor back navigation (mirrors MenuBackButton / overlay X).
 * @returns false when already at root (mainMenu / null).
 */
export function performEditorBack(): boolean {
  const state = appStore.getState();
  const {activeButton} = state;

  /** Tag overlay can be open while `activeButton` is still `mainMenu`. */
  if (state.tagMode) {
    state.setTagMode(false);
    state.setActiveButton('mainMenu');
    return true;
  }

  if (isEditorMenuRoot(activeButton)) {
    return false;
  }

  switch (activeButton) {
    case 'filter':
    case 'sticker':
    case 'audio':
      navigateBackFromFeatureMenu();
      return true;

    case 'editorMainMenu':
      navigateBackFromEditorMainMenu();
      return true;

    case 'editor':
      if (runEditorMenuBack()) {
        return true;
      }
      navigateBackFromEditorSliders();
      return true;

    case 'fontStyle':
    case 'textBackground':
    case 'textColor':
    case 'textBackgroundColor':
      navigateBackToTextMenu();
      return true;

    case 'text':
      navigateBackFromTextFlow();
      return true;

    case 'adjust':
      if (runAdjustMenuBack()) {
        return true;
      }
      if (state.tagMode) {
        state.setActiveButton('mainMenu');
        state.setTagMode(false);
      } else {
        state.setActiveButton('editorMainMenu');
      }
      return true;

    default:
      if (activeButton !== null && TEXT_FLOW_BUTTONS.has(activeButton)) {
        navigateBackFromTextFlow();
        return true;
      }
      navigateBackFromFeatureMenu();
      return true;
  }
}
