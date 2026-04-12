let verbose = false;

export function setVerbose(value: boolean): void {
  verbose = value;
}

export function log(message: string): void {
  if (verbose) {
    console.log(`[synthetic-plexus] ${message}`);
  }
}
