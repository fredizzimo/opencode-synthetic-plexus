let verbose = false;

export function setVerbose(value: boolean): void {
  verbose = value;
}

export function error(message: string): void {
  console.error(`[synthetic-plexus] ERROR: ${message}`);
}

export function warn(message: string): void {
  if (verbose) {
    console.warn(`[synthetic-plexus] WARN: ${message}`);
  }
}

export function info(message: string): void {
  if (verbose) {
    console.log(`[synthetic-plexus] ${message}`);
  }
}
