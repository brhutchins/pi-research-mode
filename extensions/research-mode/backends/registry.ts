import { ketchBackend } from "./ketch.ts";
import type { ResearchBackend } from "./types.ts";

/**
 * The research backends enabled by this extension.
 *
 * Swapping the search provider (ketch → something else) is a new backend module
 * plus an edit to this list; nothing in `mode.ts` or `guard.ts` knows the name
 * "ketch".
 */
export const researchBackends: readonly ResearchBackend[] = [ketchBackend];

export type { ResearchBackend } from "./types.ts";
