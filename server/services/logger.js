const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? LOG_LEVELS.info;

function formatLog(level, message, meta = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta
    };
    return JSON.stringify(entry);
}

export const logger = {
    debug(msg, meta) { if (CURRENT_LEVEL <= 0) console.log(formatLog('debug', msg, meta)); },
    info(msg, meta) { if (CURRENT_LEVEL <= 1) console.log(formatLog('info', msg, meta)); },
    warn(msg, meta) { if (CURRENT_LEVEL <= 2) console.warn(formatLog('warn', msg, meta)); },
    error(msg, meta) { if (CURRENT_LEVEL <= 3) console.error(formatLog('error', msg, meta)); },
};
