import type { SyntheticModel } from "./types.js";
import { validateSyntheticApiResponse } from "./validate.js";
import { info } from "./log.js";

const SYNTHETIC_API_URL = "https://api.synthetic.new/openai/v1/models";

export const FETCH_TIMEOUT_MS = 5_000;

export function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replaceAll("$", "").replace(/,/g, "");
  const value = parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid price string: '${priceStr}'`);
  }
  return value * 1_000_000;
}

export async function fetchSyntheticModels(apiKey: string): Promise<SyntheticModel[]> {
  info("Fetching models from Synthetic API...");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(SYNTHETIC_API_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Synthetic models: ${response.status} ${response.statusText}`
      );
    }
    const raw = await response.json();
    const data = validateSyntheticApiResponse(raw);
    info(`Found ${data.data.length} models from Synthetic API`);
    return data.data;
  } finally {
    clearTimeout(timeout);
  }
}
