export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel;
  private enabledNamespaces: Set<string>;

  private constructor() {
    // Set log level based on environment
    if (import.meta.env.MODE === 'production') {
      this.level = LogLevel.WARN;
    } else if (import.meta.env.MODE === 'test') {
      this.level = LogLevel.ERROR;
    } else {
      this.level = LogLevel.DEBUG;
    }

    // Initialize with all namespaces enabled in development
    this.enabledNamespaces = new Set(['*']);
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Enable logging for specific namespaces
   * Examples: 'MovementSystem', 'TargetingSystem', 'Worker'
   * Use '*' to enable all namespaces
   */
  enable(namespace: string): void {
    this.enabledNamespaces.add(namespace);
  }

  /**
   * Disable logging for specific namespaces
   */
  disable(namespace: string): void {
    this.enabledNamespaces.delete(namespace);
  }

  /**
   * Check if a namespace is enabled
   */
  private isNamespaceEnabled(namespace: string): boolean {
    if (this.enabledNamespaces.has('*')) {
      return true;
    }
    return this.enabledNamespaces.has(namespace);
  }

  /**
   * Format log message with namespace prefix
   */
  private formatMessage(namespace: string, message: string, ...args: any[]): [string, ...any[]] {
    return [`[${namespace}] ${message}`, ...args];
  }

  debug(namespace: string, message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG && this.isNamespaceEnabled(namespace)) {
      console.debug(...this.formatMessage(namespace, message, ...args));
    }
  }

  info(namespace: string, message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO && this.isNamespaceEnabled(namespace)) {
      console.info(...this.formatMessage(namespace, message, ...args));
    }
  }

  warn(namespace: string, message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN && this.isNamespaceEnabled(namespace)) {
      console.warn(...this.formatMessage(namespace, message, ...args));
    }
  }

  error(namespace: string, message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR && this.isNamespaceEnabled(namespace)) {
      console.error(...this.formatMessage(namespace, message, ...args));
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions for common use
export const debug = (namespace: string, message: string, ...args: any[]) =>
  logger.debug(namespace, message, ...args);

export const info = (namespace: string, message: string, ...args: any[]) =>
  logger.info(namespace, message, ...args);

export const warn = (namespace: string, message: string, ...args: any[]) =>
  logger.warn(namespace, message, ...args);

export const error = (namespace: string, message: string, ...args: any[]) =>
  logger.error(namespace, message, ...args);
