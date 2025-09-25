// src/utils/rnLogger.ts
interface LogData {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args?: any[];
  timestamp: number;
  component?: string;
  stack?: string;
}

class RNLogger {
  private isRNEnvironment: boolean;

  constructor() {
    // Detect if running in RN WebView
    this.isRNEnvironment =
      typeof window !== 'undefined' &&
      (window as any).ReactNativeWebView !== undefined;
  }

  private sendToRN(logData: LogData) {
    if (!this.isRNEnvironment) return;

    try {
      // Send via postMessage to React Native
      const message = {
        type: 'WEB_LOG',
        payload: logData,
      };

      if ((window as any).ReactNativeWebView?.postMessage) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
      } else if (window.parent && window.parent !== window) {
        // Fallback for other WebView implementations
        window.parent.postMessage(message, '*');
      }
    } catch (error) {
      // Fallback to regular console if RN bridge fails
      console.error('Failed to send log to RN:', error);
    }
  }

  private createLogMethod(level: LogData['level']) {
    return (message: string, ...args: any[]) => {
      const logData: LogData = {
        level,
        message,
        args,
        timestamp: Date.now(),
        stack: level === 'error' ? new Error().stack : undefined,
      };

      // Always log to browser console
      const originalConsole =
        (console as any)[
          `_original${level.charAt(0).toUpperCase() + level.slice(1)}`
        ] || console[level];
      originalConsole.call(console, `[WEB] ${message}`, ...args);

      // Send to RN if available
      this.sendToRN(logData);
    };
  }

  public log = this.createLogMethod('log');
  public info = this.createLogMethod('info');
  public warn = this.createLogMethod('warn');
  public error = this.createLogMethod('error');
  public debug = this.createLogMethod('debug');

  // Component-specific logging
  public componentLog(
    component: string,
    level: LogData['level'],
    message: string,
    ...args: any[]
  ) {
    const logData: LogData = {
      level,
      message,
      args,
      timestamp: Date.now(),
      component,
      stack: level === 'error' ? new Error().stack : undefined,
    };

    // Browser console with component prefix
    const originalConsole =
      (console as any)[
        `_original${level.charAt(0).toUpperCase() + level.slice(1)}`
      ] || console[level];
    originalConsole.call(console, `[WEB:${component}] ${message}`, ...args);

    // Send to RN
    this.sendToRN(logData);
  }
}

// Create singleton instance
export const rnLogger = new RNLogger();

// Override console methods to intercept all logs
export const setupConsoleInterception = () => {
  const originalConsole = {...console};

  // Store original methods
  (console as any)._originalLog = originalConsole.log;
  (console as any)._originalWarn = originalConsole.warn;
  (console as any)._originalError = originalConsole.error;
  (console as any)._originalInfo = originalConsole.info;
  (console as any)._originalDebug = originalConsole.debug;

  // Override console methods
  console.log = rnLogger.log;
  console.warn = rnLogger.warn;
  console.error = rnLogger.error;
  console.info = rnLogger.info;
  console.debug = rnLogger.debug;

  return () => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  };
};

// Error boundary helper
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
  rnLogger['sendToRN'](logData);
};

// Global error handler
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    rnLogger.error('Unhandled Promise Rejection:', event.reason);
    captureError(
      new Error(String(event.reason)),
      undefined,
      'PromiseRejection',
    );
  });

  // Handle uncaught errors
  window.addEventListener('error', event => {
    rnLogger.error('Uncaught Error:', event.error || event.message);
    captureError(
      event.error || new Error(event.message),
      undefined,
      'GlobalError',
    );
  });
};
