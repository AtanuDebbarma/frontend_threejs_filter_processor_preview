import {useEffect} from 'react';
import {
  applyHydrationFromPayload,
  type ApplyHydrationOptions,
} from '@/shared/helpers/hydrationBridge';
import type {HydrationPayload} from '@/shared/types/webBridgeTypes';
import {rnLogger} from '@/shared/utils/rnLogger';

/** Browser dev only (`bun run dev`). RN WebView uses inject + mediaReady instead. */
const ENABLE_DEV_MOCK_HYDRATION = import.meta.env.DEV;

type UseDevMockHydrationParams = {
  hydrationHandlers: ApplyHydrationOptions;
  mockPayload: HydrationPayload;
};

export function useDevMockHydration({
  hydrationHandlers,
  mockPayload,
}: UseDevMockHydrationParams): void {
  useEffect(() => {
    if (!ENABLE_DEV_MOCK_HYDRATION || window.ReactNativeWebView) {
      return;
    }
    const injected = (window as Window & {__EXPO_MEDIA__?: HydrationPayload})
      .__EXPO_MEDIA__;
    if (injected?.file?.length) {
      return;
    }

    rnLogger.log('🧪 Dev mock hydration');
    void applyHydrationFromPayload(mockPayload, 'DevMock', hydrationHandlers);
  }, [hydrationHandlers, mockPayload]);
}
