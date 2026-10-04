import { isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isSafeCommand } from "./bash-allowlist.ts";
import type { ResearchMode } from "./mode.ts";

/**
 * Mutating built-in tools that research mode always blocks, even when something
 * (a codemode script, a re-activation) puts them back in the active set.
 */
const MUTATING_BUILTINS = new Set(["edit", "write"]);

function exitHint(toolName: string): string {
	return `${toolName} is blocked in research mode (read-only). Run /research to disable research mode first.`;
}

/**
 * Registers the `tool_call` guard that enforces read-only behavior while
 * research mode is active:
 *
 * 1. hard-block `edit`/`write` regardless of the active tool set;
 * 2. allow `bash` only when the command matches the read-only allowlist;
 * 3. block any tool whose provider marks it destructive.
 */
export function registerGuard(pi: ExtensionAPI, mode: ResearchMode): void {
	pi.on("tool_call", async (event) => {
		if (!mode.isActive) return undefined;

		if (MUTATING_BUILTINS.has(event.toolName)) {
			return { block: true, reason: exitHint(event.toolName) };
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
