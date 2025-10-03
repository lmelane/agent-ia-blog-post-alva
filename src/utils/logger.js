import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';

class Logger {
  constructor() {
    this.logsDir = config.output.logsDir;
    this.ensureLogDir();
  }

  async ensureLogDir() {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };
    return JSON.stringify(logEntry);
  }

  async writeLog(level, message, data = null) {
    const logMessage = this.formatMessage(level, message, data);
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `${date}.log`);

    try {
      await fs.appendFile(logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  info(message, data = null) {
    console.log(`[INFO] ${message}`, data || '');
    this.writeLog('INFO', message, data);
  }

  success(message, data = null) {
    console.log(`[SUCCESS] ✓ ${message}`, data || '');
    this.writeLog('SUCCESS', message, data);
  }

  warn(message, data = null) {
    console.warn(`[WARN] ⚠ ${message}`, data || '');
    this.writeLog('WARN', message, data);
  }

  error(message, error = null) {
    console.error(`[ERROR] ✗ ${message}`, error || '');
    this.writeLog('ERROR', message, error ? {
      message: error.message,
      stack: error.stack,
    } : null);
  }

  debug(message, data = null) {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`, data || '');
      this.writeLog('DEBUG', message, data);
    }
  }
}

export const logger = new Logger();
export default logger;
