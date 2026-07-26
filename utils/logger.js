/**
 * Logger
 *
 * Simple, centralized logging utility.
 * No external dependencies - uses console under the hood.
 * Provides structured logging with levels: debug, info, warn, error.
 */

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Set to "debug", "info", "warn", or "error"
const currentLevel = process.env.LOG_LEVEL || "info";
const currentLevelValue = logLevels[currentLevel] || logLevels.info;

function shouldLog(level) {
  return logLevels[level] >= currentLevelValue;
}

function formatTimestamp() {
  return new Date().toISOString();
}

function debug(message, data = null) {
  if (shouldLog("debug")) {
    const output = data ? `[${formatTimestamp()}] DEBUG: ${message}` : `[${formatTimestamp()}] DEBUG: ${message}`;
    console.debug(output, data || "");
  }
}

function info(message, data = null) {
  if (shouldLog("info")) {
    const output = data ? `[${formatTimestamp()}] INFO: ${message}` : `[${formatTimestamp()}] INFO: ${message}`;
    console.log(output, data || "");
  }
}

function warn(message, data = null) {
  if (shouldLog("warn")) {
    const output = data ? `[${formatTimestamp()}] WARN: ${message}` : `[${formatTimestamp()}] WARN: ${message}`;
    console.warn(output, data || "");
  }
}

function error(message, err = null) {
  if (shouldLog("error")) {
    const output = `[${formatTimestamp()}] ERROR: ${message}`;
    if (err instanceof Error) {
      console.error(output, err.message, err.stack);
    } else if (err) {
      console.error(output, err);
    } else {
      console.error(output);
    }
  }
}

export { debug, info, warn, error };
