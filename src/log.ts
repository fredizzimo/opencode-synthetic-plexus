export type LogLevel = "error" | "warn" | "info";
export type LogFn = (level: LogLevel, message: string) => void;

export class Logger {
  private logFn: LogFn;

  constructor(options?: { logFn?: LogFn }) {
    this.logFn = options?.logFn ?? (() => {});
  }

  error(message: string): void {
    this.logFn("error", message);
  }

  warn(message: string): void {
    this.logFn("warn", message);
  }

  info(message: string): void {
    this.logFn("info", message);
  }
}
