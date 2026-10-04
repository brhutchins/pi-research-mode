import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { researchBackends } from "./backends/registry.ts";
import { registerGuard } from "./guard.ts";
import { ResearchMode } from "./mode.ts";

/**
 * Research mode: a read-only session mode that disables write tools and
 * restricts bash to read-only commands, while activating the tools of the
 * configured research backends (ketch by default) directly for the model.
 *
 * Toggle with `/research`, or start a session in the mode with `--research`.
 */
export default function researchModeExtension(pi: ExtensionAPI): void {
	const mode = new ResearchMode(pi, researchBackends);

	pi.registerFlag("research", {
		description: "Start in research mode (read-only, with research backends like ketch)",
		type: "boolean",
		default: false,
	});

	pi.registerCommand("research", {
		description: "Toggle research mode (read-only, with ketch research tools)",
		handler: async (_args, ctx) => mode.toggle(ctx),
	});

	// Restore branch state on start/resume/fork and on tree navigation.
	pi.on("session_start", async (_event, ctx) => mode.restore(ctx));
	pi.on("session_tree", async (_event, ctx) => mode.restore(ctx));

	// MCP servers connect in the background; pick up their tools when they do.
	pi.on("mcp_servers_change", async () => mode.refreshTools());

	// Tell the model it is in research mode.
	pi.on("before_agent_start", async () => {
		const message = mode.contextMessage();
		return message ? { message } : undefined;
	});

	// Hide stale research-mode context when the mode is off.
	pi.on("context", async (event) => {
		const messages = mode.filterContext(event.messages);
		return messages ? { messages } : undefined;
	});

	registerGuard(pi, mode);
}
