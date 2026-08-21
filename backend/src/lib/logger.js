function formatMessage(level, message) {
  const timestamp = new Date().toISOString();

  if (message instanceof Error) {
    return `[${timestamp}] [${level}] ${message.stack || message.message}`;
  }

  return `[${timestamp}] [${level}] ${message}`;
}

const logger = {
  info(message) {
    console.log(formatMessage("INFO", message));
  },

  warn(message) {
    console.warn(formatMessage("WARN", message));
  },

  error(message) {
    console.error(formatMessage("ERROR", message));
  },

  debug(message) {
    console.debug(formatMessage("DEBUG", message));
  },
};

export default logger;
