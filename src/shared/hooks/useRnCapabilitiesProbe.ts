import {useEffect} from 'react';

/** Hidden WebView capability probe — RN CreatePostMainFooter listens for CAPABILITIES. */
export function useRnCapabilitiesProbe(): void {
  useEffect(() => {
    if (!window.ReactNativeWebView) {
      return;
    }
    const webCodecs = typeof VideoEncoder !== 'undefined';
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'CAPABILITIES',
        payload: {webCodecs},
      }),
    );
  }, []);
}

export const postRnCapabilitiesAndWebReady = (): void => {
  if (!window.ReactNativeWebView) {
    return;
  }
  const webCodecs = typeof VideoEncoder !== 'undefined';
  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'CAPABILITIES',
      payload: {webCodecs},
    }),
  );
  window.ReactNativeWebView.postMessage(JSON.stringify({type: 'WEB_READY'}));
};
