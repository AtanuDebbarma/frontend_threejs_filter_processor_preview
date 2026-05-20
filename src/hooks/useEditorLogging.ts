import {useCallback, useEffect, useRef} from 'react';
import {
  configureEditorLogging,
  getEditorLoggingConfig,
  type EditorLoggingConfig,
} from '../utils/rnLogger';

/** RN → web: `{ type: 'SET_LOG_CONFIG', payload: { production: boolean } }` */
export const SET_LOG_CONFIG_MESSAGE = 'SET_LOG_CONFIG' as const;

const isLogConfigPayload = (payload: unknown): payload is EditorLoggingConfig =>
  typeof payload === 'object' &&
  payload !== null &&
  typeof (payload as EditorLoggingConfig).production === 'boolean';

/**
 * Gates postMessage log forwarding to RN.
 * `production: true` → WebView console only (no WEB_LOG / LOG_ERROR to RN).
 *
 * Default is production until RN sends SET_LOG_CONFIG (you plan to send true for now).
 */
export function useEditorLogging() {
  const configRef = useRef<EditorLoggingConfig>(getEditorLoggingConfig());

  useEffect(() => {
    configureEditorLogging({production: true});
    configRef.current = {production: true};
  }, []);

  const applyLogConfig = useCallback((config: EditorLoggingConfig) => {
    configureEditorLogging(config);
    configRef.current = config;
  }, []);

  const handleRnMessage = useCallback(
    (msg: {type?: string; payload?: unknown}) => {
      if (msg.type !== SET_LOG_CONFIG_MESSAGE) {
        return;
      }
      if (!isLogConfigPayload(msg.payload)) {
        return;
      }
      applyLogConfig(msg.payload);
    },
    [applyLogConfig],
  );

  const applyLogConfigFromHydration = useCallback(
    (production: boolean | undefined) => {
      if (typeof production === 'boolean') {
        applyLogConfig({production});
      }
    },
    [applyLogConfig],
  );

  return {
    applyLogConfig,
    handleRnMessage,
    applyLogConfigFromHydration,
    isProduction: () => configRef.current.production,
  };
}
