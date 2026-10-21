import { isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isSafeCommand } from "./bash-allowlist.ts";
import type { ResearchMode } from "./mode.ts";

/**
 * Mutating built-in tools that research mode always blocks, even when something
 * (a codemode script, a re-activation) puts them back in the active set.
 */
const MUTATING_BUILTINS = new Set(["edit", "write"]);

/**
 * pi-nixify's `nix` tool: only package discovery is read-only. `exec` runs a
 * command and must stay blocked while research mode is active.
 */
const NIX_TOOL = "nix";
const NIX_READ_ONLY_ACTIONS = new Set(["search", "provides"]);

function exitHint(toolName: string): string {
	return `${toolName} is blocked in research mode (read-only). Run /research to disable research mode first.`;
}

/**
 * Registers the `tool_call` guard that enforces read-only behavior while
 * research mode is active:
 *
 * 1. hard-block `edit`/`write` regardless of the active tool set;
 * 2. restrict pi-nixify's `nix` tool to its read-only discovery actions;
 * 3. allow `bash` only when the command matches the read-only allowlist;
 * 4. block any tool whose provider marks it destructive.
 */
export function registerGuard(pi: ExtensionAPI, mode: ResearchMode): void {
	pi.on("tool_call", async (event) => {
		if (!mode.isActive) return undefined;

		if (MUTATING_BUILTINS.has(event.toolName)) {
			return { block: true, reason: exitHint(event.toolName) };
		}

		if (event.toolName === NIX_TOOL) {
			const action = (event.input as { action?: unknown } | undefined)?.action;
			if (typeof action === "string" && NIX_READ_ONLY_ACTIONS.has(action)) {
				return undefined;
			}
			return {
				block: true,
				reason:
					"Research mode: the nix tool is limited to its read-only actions (search, provides). " +
					"Run /research to disable research mode first.",
			};
		}

		if (isToolCallEventType("bash", event)) {
			const command = event.input.command ?? "";
			if (!isSafeCommand(command)) {
				return {
					block: true,
					reason: [
						"Research mode: bash command blocked (not on the read-only allowlist).",
						"Run /research to disable research mode first.",
						`Command: ${command}`,
					].join("\n"),
				};
			}
		}

		const annotations = pi.getAllTools().find((tool) => tool.name === event.toolName)?.annotations;
		if (annotations?.destructiveHint === true) {
			return {
				block: true,
				reason: `Research mode: ${event.toolName} is marked destructive by its provider. Run /research to disable research mode first.`,
			};
		}

		return undefined;
	});
}
