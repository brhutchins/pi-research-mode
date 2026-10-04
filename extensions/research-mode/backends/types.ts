/**
 * A research backend contributes a set of model-facing tools to research mode.
 *
 * This is the TypeScript equivalent of a Rust trait: implement it once per tool
 * source (an MCP server, a built-in tool group, …). The mode logic only ever
 * talks to `ResearchBackend[]`, so swapping ketch for another search provider is
 * a new module here plus a one-line change in `registry.ts`.
 */
export interface ResearchBackend {
	/** Human-readable name, used in status and notification text. */
	readonly name: string;

	/** True if this backend owns the given registered tool name. */
	ownsTool(toolName: string): boolean;

	/**
	 * The tools to activate while research mode is on, given every registered
	 * tool name.
	 *
	 * May return an empty list when the backing server has not connected yet;
	 * callers re-invoke this on `mcp_servers_change` as tools appear.
	 */
	tools(allToolNames: readonly string[]): string[];

	/** Guidance about the backend's tools, injected into the mode context. */
	readonly instructions: string;
}
