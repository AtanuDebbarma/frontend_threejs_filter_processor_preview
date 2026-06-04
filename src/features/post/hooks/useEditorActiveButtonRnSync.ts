import {useEffect} from 'react';
import {appStore} from '@/store/appStore';
import {rnLogger} from '@/shared/utils/rnLogger';
import type {ButtonStateType} from '@/store/buttonSlices';

/** Pushes `activeButton` to RN so Create Post hardware back can mirror web menus. */
export function useEditorActiveButtonRnSync(): void {
  const activeButton = appStore(state => state.activeButton);

  useEffect(() => {
    try {
      if (!window.ReactNativeWebView) {
        return;
      }
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'EDITOR_ACTIVE_BUTTON',
          payload: {activeButton: activeButton as ButtonStateType},
        }),
      );
    } catch (error) {
      rnLogger.componentLog(
        'useEditorActiveButtonRnSync',
        'error',
        `Failed to sync active button: ${error}`,
        error,
      );
    }
  }, [activeButton]);
}
