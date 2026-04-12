import type { SyntheticModel } from "./types.js";

const SYNTHETIC_API_URL = "https://api.synthetic.new/openai/v1/models";

let verbose = false;

export function setVerbose(value: boolean): void {
  verbose = value;
}

function log(message: string): void {
  if (verbose) {
    console.log(`[synthetic-plexus] ${message}`);
  }
}

export function parsePrice(priceStr: string): number {
  const value = parseFloat(priceStr.replace("$", ""));
  return value * 1_000_000;
}

export async function fetchSyntheticModels(apiKey: string): Promise<SyntheticModel[]> {
  log("Fetching models from Synthetic API...");
  const response = await fetch(SYNTHETIC_API_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Synthetic models: ${response.status} ${response.statusText}`
    );
  }
  const data = (await response.json()) as { data: SyntheticModel[] };
  log(`Found ${data.data.length} models from Synthetic API`);
  return data.data;
}
