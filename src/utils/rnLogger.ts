// src/utils/rnLogger.ts
export type EditorLoggingConfig = {
  /** When true, logs are not forwarded to RN via postMessage. */
  production: boolean;
};

interface LogData {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args?: unknown[];
  timestamp: number;
  component?: string;
  stack?: string;
}

let loggingConfig: EditorLoggingConfig = {production: true};

export const configureEditorLogging = (config: EditorLoggingConfig): void => {
  loggingConfig = config;
};

export const getEditorLoggingConfig = (): EditorLoggingConfig => ({
  ...loggingConfig,
});

const shouldForwardToRN = (): boolean => {
  if (loggingConfig.production) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    (
      window as Window & {
        ReactNativeWebView?: {postMessage: (s: string) => void};
      }
    ).ReactNativeWebView !== undefined
  );
};

class RNLogger {
  private sendToRN(logData: LogData) {
    if (!shouldForwardToRN()) {
      return;
    }

    try {
      const message = {
        type: 'WEB_LOG',
        payload: logData,
      };

      const bridge = (
        window as Window & {
          ReactNativeWebView?: {postMessage: (s: string) => void};
        }
      ).ReactNativeWebView;

      if (bridge?.postMessage) {
        bridge.postMessage(JSON.stringify(message));
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }
    } catch (error) {
      const originalError =
        (console as Console & {_originalError?: typeof console.error})
          ._originalError ?? console.error;
      originalError.call(console, 'Failed to send log to RN:', error);
    }
  }

  private createLogMethod(level: LogData['level']) {
    return (message: string, ...args: unknown[]) => {
      const logData: LogData = {
        level,
        message,
        args,
        timestamp: Date.now(),
        stack: level === 'error' ? new Error().stack : undefined,
      };

      const originalConsole =
        (console as Console & Record<string, typeof console.log>)[
          `_original${level.charAt(0).toUpperCase() + level.slice(1)}`
        ] || console[level];
      originalConsole.call(console, `[WEB] ${message}`, ...args);

      this.sendToRN(logData);
    };
  }

  public log = this.createLogMethod('log');
  public info = this.createLogMethod('info');
  public warn = this.createLogMethod('warn');
  public error = this.createLogMethod('error');
  public debug = this.createLogMethod('debug');

  public componentLog(
    component: string,
    level: LogData['level'],
    message: string,
    ...args: unknown[]
  ) {
    const logData: LogData = {
      level,
      message,
      args,
      timestamp: Date.now(),
      component,
      stack: level === 'error' ? new Error().stack : undefined,
    };

    const originalConsole =
      (console as Console & Record<string, typeof console.log>)[
        `_original${level.charAt(0).toUpperCase() + level.slice(1)}`
      ] || console[level];
    originalConsole.call(console, `[WEB:${component}] ${message}`, ...args);

    this.sendToRN(logData);
  }
}

export const rnLogger = new RNLogger();

export const setupConsoleInterception = () => {
  const originalConsole = {...console};

  (console as Console & Record<string, unknown>)._originalLog =
    originalConsole.log;
  (console as Console & Record<string, unknown>)._originalWarn =
    originalConsole.warn;
  (console as Console & Record<string, unknown>)._originalError =
    originalConsole.error;
  (console as Console & Record<string, unknown>)._originalInfo =
    originalConsole.info;
  (console as Console & Record<string, unknown>)._originalDebug =
    originalConsole.debug;

  console.log = rnLogger.log;
  console.warn = rnLogger.warn;
  console.error = rnLogger.error;
  console.info = rnLogger.info;
  console.debug = rnLogger.debug;

  return () => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  };
};

export const captureError = (
  error: Error,
  componentStack?: string,
  component?: string,
) => {
  const logData: LogData = {
    level: 'error',
    message: `Error in ${component || 'Unknown Component'}: ${error.message}`,
    args: [error],
    timestamp: Date.now(),
    component,
    stack: error.stack || componentStack,
  };

  console.error(`[WEB:ERROR] ${logData.message}`, error);

  if (shouldForwardToRN()) {
    try {
      const bridge = (
        window as Window & {
          ReactNativeWebView?: {postMessage: (s: string) => void};
        }
      ).ReactNativeWebView;
      bridge?.postMessage(JSON.stringify({type: 'WEB_LOG', payload: logData}));
    } catch {
      /* ignore bridge errors */
    }
  }
};

export const setupGlobalErrorHandling = () => {
  window.addEventListener('unhandledrejection', event => {
    rnLogger.error('Unhandled Promise Rejection:', event.reason);
    captureError(
      new Error(String(event.reason)),
      undefined,
      'PromiseRejection',
    );
  });

  window.addEventListener('error', event => {
    rnLogger.error('Uncaught Error:', event.error || event.message);
    captureError(
      event.error || new Error(event.message),
      undefined,
      'GlobalError',
    );
  });
};
