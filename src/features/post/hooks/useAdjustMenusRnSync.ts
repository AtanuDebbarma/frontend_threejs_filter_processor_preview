import {useEffect} from 'react';
import {appStore} from '@/store/appStore';
import {rnLogger} from '@/shared/utils/rnLogger';

/** Notifies RN when adjust overlay or tag mode is active. */
export function useAdjustMenusRnSync(): void {
  const activeButton = appStore(state => state.activeButton);
  const tagMode = appStore(state => state.tagMode);

  useEffect(() => {
    try {
      if (!window.ReactNativeWebView) {
        return;
      }
      if (activeButton === 'adjust' || tagMode) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'ADJUST_MENUS_OPEN',
            payload: {},
          }),
        );
      } else {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'MENUS_CLOSE',
            payload: {},
          }),
        );
      }
    } catch (error) {
      rnLogger.componentLog(
        'useAdjustMenusRnSync',
        'error',
        `Failed to sync adjust menus: ${error}`,
        error,
      );
    }
  }, [activeButton, tagMode]);
}
