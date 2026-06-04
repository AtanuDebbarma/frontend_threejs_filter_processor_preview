import {useEffect} from 'react';
import {
  applyHydrationFromPayload,
  type ApplyHydrationOptions,
} from '@/shared/helpers/hydrationBridge';
import type {HydrationPayload} from '@/shared/types/webBridgeTypes';
import {rnLogger} from '@/shared/utils/rnLogger';
import {postRnCapabilitiesAndWebReady} from '@/shared/hooks/useRnCapabilitiesProbe';

type UseMediaReadyHydrationParams = {
  hydrationHandlers: ApplyHydrationOptions;
  applyLogConfigFromHydration: (production: boolean | undefined) => void;
};

/** RN injects __EXPO_MEDIA__ + fires mediaReady before WEB_READY. */
export function useMediaReadyHydration({
  hydrationHandlers,
  applyLogConfigFromHydration,
}: UseMediaReadyHydrationParams): void {
  useEffect(() => {
    const listener = async () => {
      const data = (window as Window & {__EXPO_MEDIA__?: HydrationPayload})
        .__EXPO_MEDIA__;
      if (!data?.file?.length) {
        rnLogger.log('⚠️ No __EXPO_MEDIA__ found on window');
        return;
      }

      applyLogConfigFromHydration(data.production);
      rnLogger.log('📥 Processing injected hydration (mediaReady)');
      await applyHydrationFromPayload(data, 'Injection', hydrationHandlers);
      postRnCapabilitiesAndWebReady();
    };

    window.addEventListener('mediaReady', listener);
    void listener();

    return () => {
      window.removeEventListener('mediaReady', listener);
    };
  }, [hydrationHandlers, applyLogConfigFromHydration]);
}
