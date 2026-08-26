const levels = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = levels[process.env.LOG_LEVEL] ?? levels.info;

function emit(level, message, meta) {
  if (levels[level] < threshold) return;

  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  const payload = meta === undefined ? '' : ` ${JSON.stringify(meta)}`;

  // eslint-disable-next-line no-console
  console.log(`${line}${payload}`);
}

export const logger = {
  debug: (message, meta) => emit('debug', message, meta),
  info: (message, meta) => emit('info', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),
};
