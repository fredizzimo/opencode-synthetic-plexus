import type { SyntheticModel } from "./types.js";
import { validateSyntheticApiResponse } from "./validate.js";
import type { Logger } from "./log.js";

export const SYNTHETIC_API_BASE_URL = "https://api.synthetic.new/openai/v1";

export const FETCH_TIMEOUT_MS = 5_000;

export function getModelSimpleName(modelId: string): string {
  return modelId.split("/").pop() || modelId;
}

/**
 * Build collision-resistant aliases for model IDs.
 *
 * Algorithm:
 * 1. Start with all model IDs in listA, depth N=1
 * 2. Sort listA by the last N path segments
 * 3. Linearly scan for duplicates — unique entries go to the result,
 *    duplicates go to listB for reprocessing
 * 4. Swap listA/listB, increment N, repeat until no duplicates remain
 *
 * Example: ["provider-a/claude-3", "provider-b/claude-3", "gpt-4"]
 *   N=1: sorted by last segment → ["provider-a/claude-3", "provider-b/claude-3", "gpt-4"]
 *        "gpt-4" is unique → result: {"gpt-4": "gpt-4"}
 *        "claude-3" collides → both go to listB
 *   N=2: sorted by last 2 segments → ["provider-a/claude-3", "provider-b/claude-3"]
 *        "provider-a/claude-3" and "provider-b/claude-3" are unique → result
 *   Final: {"gpt-4": "gpt-4", "provider-a/claude-3": "provider-a/claude-3", "provider-b/claude-3": "provider-b/claude-3"}
 */
export function buildModelAliases(modelIds: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const partsMap = new Map<string, string[]>();
  for (const id of modelIds) {
    partsMap.set(id, id.split("/"));
  }

  let listA = [...modelIds];
  let listB: string[] = [];
  let n = 1;

  while (listA.length > 0) {
    // Sort by the last N path segments so duplicates are adjacent
    listA.sort((a, b) => {
      const pa = partsMap.get(a)!.slice(-n).join("/");
      const pb = partsMap.get(b)!.slice(-n).join("/");
      return pa < pb ? -1 : pa > pb ? 1 : 0;
    });

    // Scan for runs of identical suffixes
    let i = 0;
    while (i < listA.length) {
      const key = partsMap.get(listA[i])!.slice(-n).join("/");
      let j = i + 1;
      while (j < listA.length && partsMap.get(listA[j])!.slice(-n).join("/") === key) {
        j++;
      }
      if (j - i === 1) {
        // Unique at this depth — commit to result
        result.set(listA[i], key);
      } else {
        // Still colliding — reprocess at greater depth
        for (let k = i; k < j; k++) {
          listB.push(listA[k]);
        }
      }
      i = j;
    }

    listA = listB;
    listB = [];
    n++;
  }

  return result;
}

export function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replaceAll("$", "").replace(/,/g, "");
  const value = parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid price string: '${priceStr}'`);
  }
  return value * 1_000_000;
}

export async function fetchSyntheticModels(
  apiKey: string,
  baseURL: string = SYNTHETIC_API_BASE_URL,
  logger?: Logger,
): Promise<SyntheticModel[]> {
  logger?.info("Fetching models from Synthetic API...");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseURL}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch Synthetic models: ${response.status} ${response.statusText}`);
    }
    const raw = await response.json();
    const data = validateSyntheticApiResponse(raw);
    logger?.info(`Found ${data.data.length} models from Synthetic API`);
    return data.data;
  } finally {
    clearTimeout(timeout);
  }
}
