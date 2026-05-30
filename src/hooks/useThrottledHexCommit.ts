import {useCallback, useRef} from 'react';

type HexColorPayload = {
  hex: string;
};

/**
 * Throttle high-frequency color picker changes to one commit per animation frame.
 * Keeps UI responsive while still applying the latest chosen color.
 */
export const useThrottledHexCommit = (commit: (hex: string) => void) => {
  const frameRef = useRef<number | null>(null);
  const latestHexRef = useRef<string | null>(null);

  const flushPending = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (latestHexRef.current !== null) {
      const hex = latestHexRef.current;
      latestHexRef.current = null;
      commit(hex);
    }
  }, [commit]);

  const onChange = useCallback(
    (payload: HexColorPayload) => {
      latestHexRef.current = payload.hex;
      if (frameRef.current !== null) return;

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        if (latestHexRef.current !== null) {
          const hex = latestHexRef.current;
          latestHexRef.current = null;
          commit(hex);
        }
      });
    },
    [commit],
  );

  return {onChange, flushPending};
};
