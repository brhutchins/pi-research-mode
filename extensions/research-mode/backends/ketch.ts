import type { ResearchBackend } from "./types.ts";

const TOOL_PREFIX = "mcp__ketch__";

/**
 * The ketch MCP server: web search, public-code search, curated docs, page
 * scrape, bounded crawl, and bookmarking.
 *
 * ketch is configured with the default `codemode` exposure in
 * `~/.pi/agent/mcp.json`, so outside research mode its tools are reachable only
 * from codemode scripts. Research mode activates the same tools directly.
 */
export const ketchBackend: ResearchBackend = {
	name: "ketch",
	ownsTool: (toolName) => toolName.startsWith(TOOL_PREFIX),
	tools: (allToolNames) => allToolNames.filter((name) => name.startsWith(TOOL_PREFIX)),
	instructions: [
		"ketch research tools are available directly (mcp__ketch__*):",
		"- `search` — web search",
		"- `code` — search public source code",
		"- `docs` — curated library/API documentation",
		"- `scrape` — fetch a URL as clean markdown",
		"- `crawl` — bounded same-host multi-page crawl",
		"- `tag` — bookmark a result in ketch's own store",
	].join("\n"),
};
