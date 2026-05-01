/**
 * Lightweight logger for Chrome extension content scripts.
 *
 * Usage:
 *   private readonly log = createLogger(MyClass.name);
 *   this.log.debug('Found %d items', count);
 *
 * Filter all extension output in DevTools console with: [HDA]
 *
 * Class + method name is resolved from the call stack at runtime.
 * Works reliably in non-minified builds (dev + watch). In a future
 * minified production build names would be mangled — set LOG_LEVEL
 * to SILENT or WARN for production instead of relying on caller names.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

type ConsoleFn = (...args: unknown[]) => void;

interface LevelConfig {
  label: string;
  fn: ConsoleFn;
}

const LEVEL_CONFIG: Record<LogLevel, LevelConfig> = {
  [LogLevel.DEBUG]:  { label: 'DEBUG', fn: console.debug.bind(console) },
  [LogLevel.INFO]:   { label: 'INFO ', fn: console.info.bind(console) },
  [LogLevel.WARN]:   { label: 'WARN ', fn: console.warn.bind(console) },
  [LogLevel.ERROR]:  { label: 'ERROR', fn: console.error.bind(console) },
  [LogLevel.SILENT]: { label: '     ', fn: () => {} },
};

let activeLevel: LogLevel = LogLevel.DEBUG;

/** Set the minimum level emitted across all loggers. */
export function setLogLevel(level: LogLevel): void {
  activeLevel = level;
}

export function getLogLevel(): LogLevel {
  return activeLevel;
}

/**
 * Walks the Error stack and returns the first "ClassName.methodName" frame
 * that does not belong to Logger itself.
 *
 * Example stack line:
 *   "    at SrealityScraper.processListPage (sreality.js:42:18)"
 */
function resolveCallerMethod(): { cls: string; method: string } | null {
  try {
    const lines = (new Error().stack ?? '').split('\n');
    for (const line of lines) {
      const m = line.match(
        /^\s*at\s+(?:new\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\.([A-Za-z_$][A-Za-z0-9_$]*)\s/
      );
      if (!m) continue;
      const cls = m[1];
      const method = m[2];
      if (!cls || !method) continue;
      if (cls === 'Logger') continue;
      return { cls, method };
    }
  } catch {
    // Stack parsing is best-effort — never throw from a logger.
  }
  return null;
}

export class Logger {
  constructor(private readonly context: string) {}

  debug(message: string, ...args: unknown[]): void {
    this.emit(LogLevel.DEBUG, message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.emit(LogLevel.INFO, message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.emit(LogLevel.WARN, message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.emit(LogLevel.ERROR, message, args);
  }

  private emit(level: LogLevel, message: string, args: unknown[]): void {
    if (level < activeLevel) return;

    const { label, fn } = LEVEL_CONFIG[level];
    const caller = resolveCallerMethod();

    // Formats:
    //  no caller resolved          → [ClassName]
    //  caller class == context     → [ClassName.method]
    //  caller class != context     → [ConcreteClass > BaseClass.method]
    let tag: string;
    if (!caller) {
      tag = this.context;
    } else if (caller.cls === this.context) {
      tag = `${caller.cls}.${caller.method}`;
    } else {
      tag = `${this.context} > ${caller.cls}.${caller.method}`;
    }

    fn(`[HDA] ${label} [${tag}]`, message, ...args);
  }
}

/** Create a named logger. Pass ClassName.name for automatic context tagging. */
export function createLogger(context: string): Logger {
  return new Logger(context);
}