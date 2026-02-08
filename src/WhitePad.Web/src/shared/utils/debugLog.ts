const isDebugLoggingEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true';

export function debugLog(scope: string, message: string, ...data: unknown[]) {
  if (!isDebugLoggingEnabled) {
    return;
  }

  console.log(`[${scope}] ${message}`, ...data);
}
